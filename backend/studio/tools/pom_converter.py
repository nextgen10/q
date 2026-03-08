import ast
import os
import json
import re

class POMConverter:
    def __init__(self, input_file: str, output_dir: str):
        self.input_file = input_file
        self.output_dir = output_dir
        # Map selector_string -> variable_name (for deduplication)
        self.selector_to_var = {} 
        self.locators = {} # variable_name -> selector_string
        self.locator_filters = {} # variable_name -> filter ('first', 'last', 'nth:N', or None)
        self.actions = [] # list of (action_type, target_name/value, data_info/None, page_var)
        self.data_dict = {} # key -> list of values
        self.page_name = "GeneratedPage"
        self.page_vars = {'page'}  # Track all page variable names (page, page1, page2, etc.)
        self.current_page = 'page'  # Track which page we're currently on

    def parse(self):
        with open(self.input_file, 'r') as f:
            source = f.read()
        
        tree = ast.parse(source)
        
        # Use a visitor to maintain context
        class PlaywrightVisitor(ast.NodeVisitor):
            def __init__(self, converter):
                self.converter = converter
                self.in_popup_context = False
                self.popup_trigger_action = None
                
            def visit_With(self, node):
                # Check if this is a popup context
                for item in node.items:
                    if (isinstance(item.context_expr, ast.Call) and
                        isinstance(item.context_expr.func, ast.Attribute) and
                        item.context_expr.func.attr == 'expect_popup'):
                        # We're in a popup context
                        old_in_popup = self.in_popup_context
                        self.in_popup_context = True
                        
                        # Visit the body - the action that triggers the popup
                        for stmt in node.body:
                            self.visit(stmt)
                        
                        # After the with block, mark that we should switch to popup
                        if self.popup_trigger_action:
                            self.converter.actions.append(("get_popup", None, None, 'page'))
                            self.popup_trigger_action = None
                        
                        self.in_popup_context = old_in_popup
                        return  # Don't use generic_visit since we handled the body
                
                self.generic_visit(node)
            
            def visit_Assign(self, node):
                # Detect page1 = page1_info.value pattern
                if (len(node.targets) == 1 and 
                    isinstance(node.targets[0], ast.Name) and
                    isinstance(node.value, ast.Attribute) and
                    node.value.attr == 'value'):
                    new_page_var = node.targets[0].id
                    if new_page_var.startswith('page'):
                        self.converter.page_vars.add(new_page_var)
                        # This is where we actually assign the popup
                        if self.converter.current_page != new_page_var:
                            self.converter.actions.append(("switch_page", new_page_var, None, self.converter.current_page))
                            self.converter.current_page = new_page_var
                self.generic_visit(node)
            
            def visit_Expr(self, node):
                # Visit expression statements (which contain calls)
                self.visit(node.value)
                
            def visit_Call(self, node):
                # Determine which page this call is on
                page_var = self.converter._get_page_var(node)
                
               # Update current page if it changed
                if page_var and page_var in self.converter.page_vars and page_var != self.converter.current_page:
                    # Don't auto-switch here, assignment handles it
                    pass
                
                # Use current page if we can't determine
                if not page_var:
                    page_var = self.converter.current_page
                
                # Check for page.goto method
                if self.converter._is_page_method(node, "goto", page_var):
                    url = node.args[0].value if node.args else ""
                    self.converter.actions.append(("navigate", url, None, page_var))
                    
                # Check for locator actions
                elif isinstance(node.func, ast.Attribute) and node.func.attr in ["click", "fill", "press", "dblclick", "hover", "focus", "check", "uncheck", "select_option", "drag_to", "set_input_files", "scroll_into_view_if_needed"]:
                    action = node.func.attr
                    locator_node = node.func.value
                    
                    selector, filter_type = self.converter._extract_selector(locator_node)
                    if selector:
                        if selector in self.converter.selector_to_var:
                            name = self.converter.selector_to_var[selector]
                        else:
                            name = self.converter._generate_locator_name(selector)
                            self.converter.selector_to_var[selector] = name
                            self.converter.locators[name] = selector
                            if filter_type:
                                self.converter.locator_filters[name] = filter_type
                        
                        if action == "fill" and node.args:
                            val = node.args[0].value
                            
                            # Use locator name as base for data key
                            data_key = f"{name}_DATA"
                            
                            if data_key not in self.converter.data_dict:
                                self.converter.data_dict[data_key] = []
                            
                            # Track which index this value is at
                            idx = len(self.converter.data_dict[data_key])
                            self.converter.data_dict[data_key].append(val)
                            
                            self.converter.actions.append((action, name, (data_key, idx), page_var))
                        elif action == "press" and node.args:
                            key = node.args[0].value
                            self.converter.actions.append((action, name, key, page_var))
                        elif action == "select_option" and node.args:
                            # Handle simple value selection (first arg)
                            # Could be value, label, index. Assuming value/label as string or index as int
                            val = node.args[0].value if hasattr(node.args[0], 'value') else None
                            self.converter.actions.append((action, name, val, page_var))
                        elif action == "drag_to" and node.args:
                            # Target is another locator
                            target_node = node.args[0]
                            # We need to extract selector for target too
                            # This is complex because _extract_selector expects a locator node (Call or Attribute), 
                            # but here target_node IS that locator node.
                            t_selector, t_filter = self.converter._extract_selector(target_node)
                            if t_selector:
                                if t_selector in self.converter.selector_to_var:
                                    t_name = self.converter.selector_to_var[t_selector]
                                else:
                                    t_name = self.converter._generate_locator_name(t_selector)
                                    self.converter.selector_to_var[t_selector] = t_name
                                    self.converter.locators[t_name] = t_selector
                                    if t_filter:
                                        self.converter.locator_filters[t_name] = t_filter
                                self.converter.actions.append((action, name, t_name, page_var))
                        elif action == "set_input_files" and node.args:
                            # Simplified: assume single file path string
                            val = node.args[0].value if hasattr(node.args[0], 'value') else "file.txt"
                            self.converter.actions.append((action, name, val, page_var))
                        else:
                            # actions like click, dblclick, hover, focus, check, uncheck, scroll_into_view_if_needed
                            # This might be the popup trigger (specifically click)
                            if self.in_popup_context and action == "click":
                                self.popup_trigger_action = (action, name, None, page_var)
                            self.converter.actions.append((action, name, None, page_var))

                # Check for expect checks
                elif isinstance(node.func, ast.Attribute) and node.func.attr.startswith("to_"):
                    method_name = node.func.attr
                    expect_call = node.func.value
                    
                    # Handle page assertions: expect(page).to_have_title(...)
                    if (isinstance(expect_call, ast.Call) and 
                        isinstance(expect_call.func, ast.Name) and 
                        expect_call.func.id == "expect" and 
                        expect_call.args):
                        
                        target_arg = expect_call.args[0]
                        
                        # Page assertions
                        if self.converter._get_page_var(target_arg): # If the arg resolves to a page variable
                             # Double check it's not a locator call
                             if isinstance(target_arg, ast.Name): # expect(page)
                                 if method_name == "to_have_title" and node.args:
                                     self.converter.actions.append(("verify_title", node.args[0].value, None, target_arg.id))
                                 elif method_name == "to_have_url" and node.args:
                                     self.converter.actions.append(("verify_url", node.args[0].value, None, target_arg.id))
                             
                        # Element assertions
                        # We need to ensure target_arg is a locator expression
                        selector, filter_type = self.converter._extract_selector(target_arg)
                        
                        if selector:
                            if selector in self.converter.selector_to_var:
                                name = self.converter.selector_to_var[selector]
                            else:
                                name = self.converter._generate_locator_name(selector)
                                self.converter.selector_to_var[selector] = name
                                self.converter.locators[name] = selector
                                if filter_type:
                                    self.converter.locator_filters[name] = filter_type
                            
                            if method_name == "to_have_text" and node.args:
                                expected_text = node.args[0].value
                                self.converter.actions.append(("verify_text", name, expected_text, page_var))
                            elif method_name == "to_be_visible":
                                self.converter.actions.append(("verify_visible", name, None, page_var))
                            elif method_name == "to_be_hidden":
                                self.converter.actions.append(("verify_hidden", name, None, page_var))
                            elif method_name == "to_be_enabled":
                                self.converter.actions.append(("verify_enabled", name, None, page_var))
                            elif method_name == "to_be_disabled":
                                self.converter.actions.append(("verify_disabled", name, None, page_var))
                            elif method_name == "to_contain_text" and node.args:
                                expected_text = node.args[0].value
                                self.converter.actions.append(("verify_contains_text", name, expected_text, page_var))
                            elif method_name == "to_match_aria_snapshot" and node.args:
                                snapshot = node.args[0].value
                                self.converter.actions.append(("verify_snapshot", name, snapshot, page_var))
                            elif method_name == "to_have_value" and node.args:
                                expected_value = node.args[0].value
                                self.converter.actions.append(("verify_value", name, expected_value, page_var))
                            elif method_name == "to_be_empty":
                                self.converter.actions.append(("verify_empty", name, None, page_var))
                            elif method_name == "to_have_attribute" and len(node.args) >= 2:
                                attr = node.args[0].value
                                val = node.args[1].value
                                self.converter.actions.append(("verify_attribute", name, (attr, val), page_var))
                            elif method_name == "to_have_count" and node.args:
                                count = node.args[0].value
                                self.converter.actions.append(("verify_count", name, count, page_var))
                            elif method_name == "to_have_css" and len(node.args) >= 2:
                                prop = node.args[0].value
                                val = node.args[1].value
                                self.converter.actions.append(("verify_css", name, (prop, val), page_var))
                
                self.generic_visit(node)
        
        visitor = PlaywrightVisitor(self)
        visitor.visit(tree)

    def _is_page_method(self, node, method_name, expected_page_var):
        return (isinstance(node.func, ast.Attribute) and 
                node.func.attr == method_name and 
                (getattr(node.func.value, 'id', '') == expected_page_var))

    def _get_page_var(self, node):
        """
        Recursively gets the base page variable name from a call node.
        e.g., page.locator(...).click() -> 'page'
              page1.goto(...) -> 'page1'
              expect(page.locator(...)) -> 'page'
        """
        if isinstance(node, ast.Call):
            # Special handling for expect(locator)
            if isinstance(node.func, ast.Name) and node.func.id == 'expect':
                if node.args:
                    return self._get_page_var(node.args[0])
            return self._get_page_var(node.func)
        elif isinstance(node, ast.Attribute):
            # This is for page.locator or page.goto
            if isinstance(node.value, ast.Name):
                return node.value.id
            # This is for page.locator(...).click()
            return self._get_page_var(node.value)
        elif isinstance(node, ast.Name):
            # This is the base page variable itself
            return node.id
        return None

    def _extract_selector(self, node):
        """
        Extracts a valid selector string from a locator node.
        Handles page.locator('...') and attempts to convert get_by_* to CSS where possible.
        Also handles .first, .last, .nth() filters.
        Returns: tuple of (selector_string, filter) where filter is 'first', 'last', 'nth:N', or None
        """
        filter_type = None
        
        # Handle .first, .last, .nth() - track them and strip to get to the base locator
        if isinstance(node, ast.Attribute) and node.attr in ['first', 'last']:
            filter_type = node.attr
            node = node.value
        
        if isinstance(node, ast.Call):
            # Handle .nth(index)
            if isinstance(node.func, ast.Attribute) and node.func.attr == 'nth':
                if node.args and isinstance(node.args[0], ast.Constant):
                    filter_type = f"nth:{node.args[0].value}"
                node = node.func.value
            
            if isinstance(node.func, ast.Attribute):
                method = node.func.attr
                
                if method == "locator" and node.args:
                    return (node.args[0].value, filter_type)
                
                # Handle get_by_* conversions
                if method.startswith("get_by_") and node.args:
                    arg = node.args[0].value
                    selector = None
                    if method == "get_by_placeholder":
                        selector = f"[placeholder='{arg}']"
                    elif method == "get_by_text":
                        selector = f"text={arg}"
                    elif method == "get_by_title":
                        selector = f"[title='{arg}']"
                    elif method == "get_by_alt_text":
                        selector = f"[alt='{arg}']"
                    elif method == "get_by_test_id":
                        selector = f"[data-testid='{arg}']"
                    elif method == "get_by_role":
                         role = arg
                         name_arg = None
                         is_exact = False
                         
                         for keyword in node.keywords:
                             if keyword.arg == 'name':
                                 if isinstance(keyword.value, ast.Constant):
                                     name_arg = keyword.value.value
                             elif keyword.arg == 'exact':
                                 if isinstance(keyword.value, ast.Constant):
                                     is_exact = keyword.value.value
                         
                         selector = f"internal:role={role}"
                         if name_arg:
                             op = "=" if is_exact else "*="
                             selector += f"[name{op}'{name_arg}']"
                    
                    if selector:
                        return (selector, filter_type)

        return (None, None)

    def _generate_locator_name(self, selector):
        # Try to find a meaningful name in the selector
        # Priority: name=, placeholder=, data-testid=, text=
        
        # internal:role=link[name="Login"] -> LOGIN_LINK
        role_match = re.search(r"internal:role=(\w+)\[name\W+([^'\"\]]+)['\"\]]", selector)
        if role_match:
            role = role_match.group(1).upper()
            name = role_match.group(2).upper()
            clean_name = re.sub(r'[^A-Z0-9]+', '_', name).strip('_')
            return f"{clean_name}_{role}"

        # [placeholder='email'] -> EMAIL_INPUT
        placeholder_match = re.search(r"placeholder\W+([^'\"\]]+)['\"\]]", selector)
        if placeholder_match:
            name = placeholder_match.group(1).upper()
            clean_name = re.sub(r'[^A-Z0-9]+', '_', name).strip('_')
            return f"{clean_name}_INPUT"

        # [name='email'] -> EMAIL_FIELD
        name_match = re.search(r"name\W+([^'\"\]]+)['\"\]]", selector)
        if name_match:
            name = name_match.group(1).upper()
            clean_name = re.sub(r'[^A-Z0-9]+', '_', name).strip('_')
            return f"{clean_name}_FIELD"

        # text=Login -> LOGIN_TEXT
        text_match = re.search(r"text=([^'\"\]]+)", selector)
        if text_match:
            name = text_match.group(1).upper()
            clean_name = re.sub(r'[^A-Z0-9]+', '_', name).strip('_')
            return f"{clean_name}_TEXT"

        # Heuristic to make a variable name from selector
        # remove special chars (collapse multiple)
        clean = re.sub(r'[^a-zA-Z0-9]+', '_', selector).upper().strip('_')
        # remove strictly numeric naming
        if clean and clean[0].isdigit():
            clean = "L_" + clean
        
        # trim
        if len(clean) > 40:
            clean = clean[:40].strip('_')
            
        # Ensure it's not empty
        if not clean:
            clean = "UNKNOWN_LOCATOR"
            
        return clean
    
    def _get_locator_with_filter(self, locator_name):
        """
        Returns the filter expression for a locator (.first, .last, .nth(N))
        or empty string if no filter is needed.
        """
        if locator_name not in self.locator_filters:
            return ""
        
        filter_type = self.locator_filters[locator_name]
        if filter_type == "first":
            return ".first"
        elif filter_type == "last":
            return ".last"
        elif filter_type.startswith("nth:"):
            index = filter_type.split(":")[1]
            return f".nth({index})"
        return ""

    def generate_pom(self):
        # 0. Ensure root is a package?
        # Actually, generated_pom should be the package.
        
        # Ensure directories exist and are packages
        for subdir in ["locators", "pages", "data", "tests"]:
            path = os.path.join(self.output_dir, subdir)
            os.makedirs(path, exist_ok=True)
            # Create __init__.py in subdirectories
            with open(os.path.join(path, "__init__.py"), 'w') as f:
                pass
        
        # Create __init__.py in the output_dir itself (e.g. generated_pom/)
        with open(os.path.join(self.output_dir, "__init__.py"), 'w') as f:
            pass

        # 1. Locators
        locators_path = os.path.join(self.output_dir, "locators", "generated_locators.py")
        with open(locators_path, 'w') as f:
            f.write("class GeneratedLocators:\n")
            for name, selector in self.locators.items():
                f.write(f"    {name} = \"{selector}\"\n")
        
        # 2. Page
        page_path = os.path.join(self.output_dir, "pages", "generated_page.py")
        with open(page_path, 'w') as f:
            # Import from root packages directly (assuming PYTHONPATH is correct)
            f.write("from base.base_page import BasePage\n")
            f.write("from generated_pom.locators.generated_locators import GeneratedLocators\n")
            f.write("from playwright.sync_api import expect\n\n")
            f.write(f"class {self.page_name}(BasePage):\n")
            
            f.write("    def run_generated_flow(self, data: dict):\n")
            # Track page variables dynamically
            for action_tuple in self.actions:
                op = action_tuple[0]
                page_var = action_tuple[3] if len(action_tuple) > 3 else 'page'
                
                if op == "get_popup":
                    f.write(f"        popup_page = self.page.context.pages[-1]  # Get the new popup\n")
                elif op == "switch_page":
                    new_page = action_tuple[1]
                    # Popup already retrieved, just continue using it
                    pass
                elif op == "navigate":
                    url = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.navigate_to(\"{url}\")\n")
                    else:
                        f.write(f"        popup_page.goto(\"{url}\")\n")
                elif op == "click":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.click(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        self._popup_click(popup_page, GeneratedLocators.{name}, '{locator_expr}', '{name}')\n")
                elif op == "dblclick":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.double_click(GeneratedLocators.{name})\n")
                    else:
                        f.write(f"        # Popup dblclick not fully supported yet in BasePage popup helpers\n")
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.dblclick()\n")
                elif op == "hover":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.hover(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.hover()\n")
                elif op == "focus":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.focus(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.focus()\n")
                elif op == "check":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.check_checkbox(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.check()\n")
                elif op == "uncheck":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.uncheck_checkbox(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.uncheck()\n")
                elif op == "select_option":
                    name = action_tuple[1]
                    val = action_tuple[2]
                    # Attempt to guess if value is 'label' or 'value' - difficult without inspecting, assume value for now if string
                    arg_str = f"value=\"{val}\"" if isinstance(val, str) else f"value={val}"
                    if page_var == 'page':
                        f.write(f"        self.select_dropdown(GeneratedLocators.{name}, {arg_str})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.select_option({arg_str})\n")
                elif op == "drag_to":
                    src_name = action_tuple[1]
                    tgt_name = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.drag_and_drop(GeneratedLocators.{src_name}, GeneratedLocators.{tgt_name})\n")
                    else:
                        f.write(f"        # DragAndDrop on popup requires manual locator handling\n")
                        f.write(f"        src = popup_page.locator(GeneratedLocators.{src_name})\n")
                        f.write(f"        tgt = popup_page.locator(GeneratedLocators.{tgt_name})\n")
                        f.write(f"        src.drag_to(tgt)\n")
                elif op == "set_input_files":
                    name = action_tuple[1]
                    val = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.upload_file(GeneratedLocators.{name}, \"{val}\")\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.set_input_files(\"{val}\")\n")
                elif op == "scroll_into_view_if_needed":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.scroll_into_view(GeneratedLocators.{name})\n")
                    else:
                         locator_expr = self._get_locator_with_filter(name)
                         f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.scroll_into_view_if_needed()\n")
                elif op == "fill":
                    name = action_tuple[1]
                    data_info = action_tuple[2] # (data_key, index)
                    data_key, idx = data_info
                    if page_var == 'page':
                        f.write(f"        self.type_text(GeneratedLocators.{name}, data.get(\"{data_key}\", [\"\"] * {idx + 1})[{idx}])\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        self._popup_fill(popup_page, GeneratedLocators.{name}, '{locator_expr}', data.get(\"{data_key}\", [\"\"] * {idx + 1})[{idx}], '{name}')\n")
                elif op == "press":
                    name = action_tuple[1]
                    key = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.press_key(GeneratedLocators.{name}, \"{key}\")\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        # Press on popup locator directly as BasePage.press_key is for self.page\n")
                        f.write(f"        popup_page.locator(GeneratedLocators.{name}){locator_expr}.press(\"{key}\")\n")
                elif op == "verify_text":
                    name = action_tuple[1]
                    expected = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_text(GeneratedLocators.{name}, \"{expected}\")\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        self._popup_verify_text(popup_page, GeneratedLocators.{name}, '{locator_expr}', \"{expected}\", '{name}')\n")
                elif op == "verify_contains_text":
                    name = action_tuple[1]
                    expected = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_contains_text(GeneratedLocators.{name}, \"{expected}\")\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        # _popup_verify_text uses to_contain_text already
                        f.write(f"        self._popup_verify_text(popup_page, GeneratedLocators.{name}, '{locator_expr}', \"{expected}\", '{name}')\n")
                elif op == "verify_visible":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_visible(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_be_visible()\n")
                elif op == "verify_hidden":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_hidden(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_be_hidden()\n")
                elif op == "verify_enabled":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_enabled(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_be_enabled()\n")
                elif op == "verify_disabled":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_disabled(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_be_disabled()\n")
                elif op == "verify_snapshot":
                    name = action_tuple[1]
                    snapshot = action_tuple[2]
                    # Escape newlines or quotes in snapshot string if necessary
                    # For now, simplistic handling
                    snapshot_repr = repr(snapshot)  # This adds quotes around it
                    if page_var == 'page':
                        f.write(f"        self.verify_aria_snapshot(GeneratedLocators.{name}, {snapshot_repr})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_match_aria_snapshot({snapshot_repr})\n")
                elif op == "verify_value":
                    name = action_tuple[1]
                    expected = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_value(GeneratedLocators.{name}, \"{expected}\")\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_have_value(\"{expected}\")\n")
                elif op == "verify_empty":
                    name = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_empty(GeneratedLocators.{name})\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_be_empty()\n")
                elif op == "verify_attribute":
                    name = action_tuple[1]
                    attr, val = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_attribute(GeneratedLocators.{name}, \"{attr}\", \"{val}\")\n")
                    else:
                        locator_expr = self._get_locator_with_filter(name)
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name}){locator_expr}).to_have_attribute(\"{attr}\", \"{val}\")\n")
                elif op == "verify_count":
                    name = action_tuple[1]
                    count = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.verify_element_count(GeneratedLocators.{name}, {count})\n")
                    else:
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name})).to_have_count({count})\n")
                elif op == "verify_css":
                    name = action_tuple[1]
                    prop, val = action_tuple[2]
                    if page_var == 'page':
                        f.write(f"        self.verify_css_property(GeneratedLocators.{name}, \"{prop}\", \"{val}\")\n")
                    else:
                        f.write(f"        expect(popup_page.locator(GeneratedLocators.{name})).to_have_css(\"{prop}\", \"{val}\")\n")
                elif op == "verify_title":
                    title = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.verify_title(\"{title}\")\n")
                    else:
                        f.write(f"        expect(popup_page).to_have_title(\"{title}\")\n")
                elif op == "verify_url":
                    url = action_tuple[1]
                    if page_var == 'page':
                        f.write(f"        self.verify_url(\"{url}\")\n")
                    else:
                        f.write(f"        expect(popup_page).to_have_url(\"{url}\")\n")
                        
            if not self.actions:
                f.write("        pass\n")

        # 3. Data (Append mode check?) - For now overwrite
        data_path = os.path.join(self.output_dir, "data", "generated_data.json")
        with open(data_path, 'w') as f:
            json.dump(self.data_dict, f, indent=4)
            
        # 4. Test
        test_path = os.path.join(self.output_dir, "tests", "test_generated.py")
        with open(test_path, 'w') as f:
            f.write("import pytest\n")
            # Import from generated_pom
            # Import from package
            pkg_name = os.path.basename(self.output_dir)
            f.write(f"from {pkg_name}.pages.generated_page import GeneratedPage\n")
            f.write("from utils.json_util import JsonUtil\n")
            f.write("from config.config import Config\n")
            f.write("import os\n\n")
            f.write("class TestGenerated:\n")
            f.write("    @pytest.fixture\n")
            f.write("    def generated_data(self):\n")
            f.write(f"        # Dynamically constructing path relative to this test file\n")
            f.write(f"        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))\n")
            f.write(f"        path = os.path.join(base_dir, \"data\", \"generated_data.json\")\n")
            f.write("        if os.path.exists(path):\n")
            f.write("            return JsonUtil.read_json(path)\n")
            f.write("        return {}\n\n")
            # Use 'page' fixture from playwright-pytest by default
            f.write("    def test_flow(self, page, generated_data):\n")
            f.write("        page.set_default_timeout(Config.TIMEOUT)\n")
            f.write("        try:\n")
            f.write("            page_obj = GeneratedPage(page)\n")
            f.write("            page_obj.run_generated_flow(generated_data)\n")
            f.write("        except Exception as e:\n")
            f.write("            import traceback\n")
            f.write("            traceback.print_exc()\n")
            f.write("            raise e\n")

        print("POM conversion successful.")

if __name__ == "__main__":
    import sys
    # Usage: python pom_converter.py raw.py output_dir
    input_f = "raw_recorded.py"
    output_d = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
    
    if len(sys.argv) > 1:
        input_f = sys.argv[1]
    if len(sys.argv) > 2:
        output_d = sys.argv[2]
        
    converter = POMConverter(input_f, output_d)
    converter.parse()
    converter.generate_pom()

