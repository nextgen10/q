from playwright.sync_api import Page, Locator, expect, FrameLocator
from config.config import Config
from utils.report_manager import ReportManager
import time
from contextlib import contextmanager

class BasePage:
    def __init__(self, page: Page):
        self.page = page
        self.report_manager = ReportManager(Config.REPORTS_DIR)

    @property
    def shared_flows(self):
        """Lazy access to SharedFlows to avoid circular imports."""
        try:
            from flows.shared_flows import SharedFlows
            return SharedFlows(self.page)
        except (ImportError, AttributeError):
            # Fallback if flows are not yet implemented or misconfigured
            return None

    # =================================================================================================
    #                                      CORE UTILITIES
    # =================================================================================================

    def wait_for_element(self, selector: str, state: str = "visible", timeout: int = None) -> str:
        """
        Explicitly wait for an element to reach a desired state.
        Returns the (possibly healed) selector.
        """
        try:
            # Use Config timeout if not specified
            t = timeout if timeout else Config.TIMEOUT
            self.page.wait_for_selector(selector, state=state, timeout=t)
            return selector
        except Exception as e:
            # --- SELF HEALING START ---
            healed_selector = self._attempt_healing(selector, e)
            if healed_selector:
                try:
                    # Retry with new selector
                    self.page.wait_for_selector(healed_selector, state=state, timeout=5000)
                    self.report_manager.log_step(None, "WARN", f"Self-Healed! updated selector: {healed_selector} (was {selector})")
                    return healed_selector 
                except Exception as retry_e:
                    pass
            # --- SELF HEALING END ---
            
            path = self.report_manager.capture_screenshot(self.page, "wait_fail")
            self.report_manager.log_step(None, "FAIL", f"Timeout waiting for {selector} to be {state}: {e}", path)
            raise e

    # ... (highlight helper methods) ...

    # =================================================================================================
    #                                      INTERACTIONS
    # =================================================================================================

    def click(self, selector: str, modifiers: list = None, force: bool = False, position: dict = None, delay: int = None, button: str = "left"):
        """
        Standard click with advanced options.
        """
        try:
            # wait_for_element might heal the selecor
            valid_selector = self.wait_for_element(selector)
            
            locator = self.page.locator(valid_selector)
            self._highlight(locator)
            # Take screenshot BEFORE action to ensure highlight visibility
            path = self.report_manager.capture_screenshot(self.page, "click_target")
            locator.click(modifiers=modifiers, force=force, position=position, delay=delay, button=button)
            self.report_manager.log_step(None, "PASS", f"Clicked element: {valid_selector} (btn={button})", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "click_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to click {selector}: {e}", path)
            raise e

    # ... (other methods) ...

    def type_text(self, selector: str, text: str, clear_first: bool = False, delay: int = 0):
        try:
            valid_selector = self.wait_for_element(selector)
            locator = self.page.locator(valid_selector)
            if clear_first:
                locator.clear()
            locator.fill(text)
            # Highlight AFTER fill so the text is visible in screenshot
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "type_pass")
            self.report_manager.log_step(None, "PASS", f"Typed '{text}' into {valid_selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "type_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to type into {selector}: {e}", path)
            raise e

    def _attempt_healing(self, selector: str, error: Exception) -> str:
        if not getattr(Config, 'SELF_HEALING', False): return None
        print(f"\\n[AI-HEAL] Selector '{selector}' failed. Attempting to heal...")
        try:
            import sys, os
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if project_root not in sys.path: sys.path.append(project_root)
            from studio.backend.services.ai_service import get_ai_service
            
            ai = get_ai_service()
            new_selector = ai.heal_locator(selector, str(error), self.page.content())
            if new_selector:
                print(f"[AI-HEAL] Suggested: {new_selector}")
                return new_selector
        except Exception as hx:
            print(f"[AI-HEAL] Error: {hx}")
        return None

    def _highlight(self, locator: Locator) -> None:
        """Adds a ultra-visible temporary highlight."""
        try:
            if not getattr(Config, 'HIGHLIGHT_ELEMENTS', True): return
            locator.evaluate("""el => { 
                el.dataset.originalOutline = el.style.outline; 
                el.dataset.originalOutlineOffset = el.style.outlineOffset;
                el.dataset.originalShadow = el.style.boxShadow;
                el.dataset.originalZIndex = el.style.zIndex;
                el.dataset.originalBorder = el.style.border;
                
                el.style.setProperty('outline', '3px solid red', 'important'); 
                el.style.setProperty('outline-offset', '2px', 'important');
                el.style.setProperty('box-shadow', '0 0 10px 2px red', 'important');
                el.style.setProperty('z-index', '999999', 'important');
                el.style.setProperty('border', '2px solid red', 'important');
            }""")
            time.sleep(0.08) # Wait for paint
        except Exception:
            pass

    def _remove_highlight(self, locator: Locator) -> None:
        """Removes the temporary highlight."""
        try:
            if not getattr(Config, 'HIGHLIGHT_ELEMENTS', True): return
            locator.evaluate("""el => { 
                el.style.outline = el.dataset.originalOutline || ''; 
                el.style.outlineOffset = el.dataset.originalOutlineOffset || '';
                el.style.boxShadow = el.dataset.originalShadow || '';
                el.style.zIndex = el.dataset.originalZIndex || '';
                el.style.border = el.dataset.originalBorder || '';
            }""")
        except Exception:
            pass

    def _is_visible(self, locator: Locator) -> bool:
        try:
            return locator.is_visible()
        except:
            return False

    # =================================================================================================
    #                                      NAVIGATION & PAGE ACTIONS
    # =================================================================================================

    def navigate_to(self, url: str):
        try:
            self.page.goto(url, wait_until="load")
            path = self.report_manager.capture_screenshot(self.page, "nav_pass")
            self.report_manager.log_step(None, "PASS", f"Navigated to {url}", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "nav_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to navigate to {url}: {e}", path)
            raise e

    def reload_page(self):
        try:
            self.page.reload()
            self.page.wait_for_load_state("domcontentloaded")
            path = self.report_manager.capture_screenshot(self.page, "reload_pass")
            self.report_manager.log_step(None, "PASS", "Reloaded page", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "reload_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to reload page: {e}", path)
            raise e

    def go_back(self):
        try:
            self.page.go_back()
            # Wait for stability
            self.page.wait_for_load_state("domcontentloaded")
            path = self.report_manager.capture_screenshot(self.page, "goback_pass")
            self.report_manager.log_step(None, "PASS", "Navigated back", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "goback_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to go back: {e}", path)
            raise e

    def wait_for_url(self, url_pattern: str, timeout: int = None):
        try:
            self.page.wait_for_url(url_pattern, timeout=timeout or Config.TIMEOUT)
            path = self.report_manager.capture_screenshot(self.page, "waiturl_pass")
            self.report_manager.log_step(None, "PASS", f"URL matched pattern: {url_pattern}", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "waiturl_fail")
            self.report_manager.log_step(None, "FAIL", f"URL did not match '{url_pattern}': {e}", path)
            raise e
            
    def bring_to_front(self):
        """Bring page to front (activate tab)"""
        try:
            self.page.bring_to_front()
            path = self.report_manager.capture_screenshot(self.page, "bring_front_pass")
            self.report_manager.log_step(None, "PASS", "Brought page to front", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "bring_front_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to bring to front: {e}", path)

    def close_tab(self):
        """Close current tab"""
        try:
            self.page.close()
            # Tab closed, cannot take screenshot of it.
            self.report_manager.log_step(None, "PASS", "Closed tab")
        except Exception as e:
            # Maybe tab acts weird. Try to screenshot if possible
            self.report_manager.log_step(None, "FAIL", f"Failed to close tab: {e}")

    # =================================================================================================
    #                                      DATA RETRIEVAL (Getters)
    # =================================================================================================

    def get_text(self, selector: str) -> str:
        try:
            self.wait_for_element(selector)
            return self.page.locator(selector).text_content()
        except Exception:
            return ""

    def get_inner_text(self, selector: str) -> str:
        try:
            self.wait_for_element(selector)
            return self.page.locator(selector).inner_text()
        except Exception:
            return ""

    def get_attribute(self, selector: str, attribute_name: str) -> str:
        try:
            self.wait_for_element(selector)
            return self.page.locator(selector).get_attribute(attribute_name)
        except Exception:
            return None

    def get_value(self, selector: str) -> str:
        try:
            self.wait_for_element(selector)
            return self.page.locator(selector).input_value()
        except Exception:
            return ""

    def is_element_visible(self, selector: str) -> bool:
        return self.page.locator(selector).is_visible()

    def is_element_enabled(self, selector: str) -> bool:
        return self.page.locator(selector).is_enabled()

    def is_element_checked(self, selector: str) -> bool:
        return self.page.locator(selector).is_checked()
        
    def bounding_box(self, selector: str):
        """Returns visual bounding box of element: {x, y, width, height}"""
        try:
            self.wait_for_element(selector)
            return self.page.locator(selector).bounding_box()
        except:
            return None

    # =================================================================================================
    #                                      INTERACTIONS
    # =================================================================================================

    def click(self, selector: str, modifiers: list = None, force: bool = False, position: dict = None, delay: int = None, button: str = "left"):
        """
        Standard click with advanced options:
        modifiers: list of ['Alt', 'Control', 'Meta', 'Shift']
        force: boolean, bypasses visibility checks
        position: dict {'x': 10, 'y': 10} relative to top-left of element
        delay: int (ms) time to wait between mousedown and mouseup
        """
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            # Take screenshot BEFORE action to ensure highlight visibility
            path = self.report_manager.capture_screenshot(self.page, "click_target")
            locator.click(modifiers=modifiers, force=force, position=position, delay=delay, button=button)
            self.report_manager.log_step(None, "PASS", f"Clicked element: {selector} (btn={button})", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "click_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to click {selector}: {e}", path)
            raise e

    def tap(self, selector: str, modifiers: list = None, force: bool = False, position: dict = None):
        """Perform a tap gesture (for touch emulation)"""
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "tap_target")
            locator.tap(modifiers=modifiers, force=force, position=position)
            self.report_manager.log_step(None, "PASS", f"Tapped element: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
             path = self.report_manager.capture_screenshot(self.page, "tap_fail")
             self.report_manager.log_step(None, "FAIL", f"Failed to tap {selector}: {e}", path)
             raise e

    def double_click(self, selector: str, modifiers: list = None, force: bool = False, position: dict = None, delay: int = None):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "dblclick_target")
            locator.dblclick(modifiers=modifiers, force=force, position=position, delay=delay)
            self.report_manager.log_step(None, "PASS", f"Double clicked: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "dblclick_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed double click {selector}: {e}", path)
            raise e

    def right_click(self, selector: str):
        # Convenience wrapper for click(button='right')
        # Screenshots handled by click
        self.click(selector, button="right")

    def hover(self, selector: str, modifiers: list = None, force: bool = False, position: dict = None):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            # Highlight before hover might be weird if it changes layout, but usually fine
            locator.hover(modifiers=modifiers, force=force, position=position)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "hover_pass")
            self.report_manager.log_step(None, "PASS", f"Hovered over: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "hover_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to hover {selector}: {e}", path)
            raise e
            
    def focus(self, selector: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            locator.focus()
            path = self.report_manager.capture_screenshot(self.page, "focus_pass")
            self.report_manager.log_step(None, "PASS", f"Focused on {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "focus_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to focus {selector}: {e}", path)
            raise e
            
    def dispatch_event(self, selector: str, type: str, event_init: dict = None):
        """Dispatch a DOM event (e.g., 'click', 'input', 'change')"""
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            locator.dispatch_event(type, eventInit=event_init)
            path = self.report_manager.capture_screenshot(self.page, "dispatch_pass")
            self.report_manager.log_step(None, "PASS", f"Dispatched event '{type}' to {selector}", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "dispatch_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to dispatch event {type} to {selector}: {e}", path)
            raise e

    def scroll_into_view(self, selector: str):
        try:
            locator = self.page.locator(selector)
            locator.scroll_into_view_if_needed()
            path = self.report_manager.capture_screenshot(self.page, "scroll_pass")
            self.report_manager.log_step(None, "PASS", f"Scrolled {selector} into view", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "scroll_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to scroll to {selector}: {e}", path)

    def type_text(self, selector: str, text: str, clear_first: bool = False, delay: int = 0):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            if clear_first:
                locator.clear()
            locator.fill(text)
            # Highlight AFTER fill so the text is visible in screenshot
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "type_pass")
            self.report_manager.log_step(None, "PASS", f"Typed '{text}' into {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "type_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to type into {selector}: {e}", path)
            raise e
            
    def press_sequentially(self, selector: str, text: str, delay: int = 50):
        """Type text character by character with a delay (ms)"""
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            locator.press_sequentially(text, delay=delay)
            # Highlight AFTER typing
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "type_seq_pass")
            self.report_manager.log_step(None, "PASS", f"Typed sequentially '{text}' into {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "type_seq_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to type sequentially {selector}: {e}", path)
            raise e

    def clear_input(self, selector: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "clear_target")
            locator.clear()
            self.report_manager.log_step(None, "PASS", f"Cleared input: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "clear_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to clear {selector}: {e}", path)
            raise e

    def press_key(self, selector: str, key: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            locator.press(key)
            path = self.report_manager.capture_screenshot(self.page, "press_key_pass")
            self.report_manager.log_step(None, "PASS", f"Pressed key '{key}' on {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "press_key_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to press key on {selector}: {e}", path)
            raise e
            
    def keyboard_down(self, key: str):
        try:
            self.page.keyboard.down(key)
            # Low level, usually no screenshot unless fail, but user asked for all.
            # Only taking screenshot not logging aggressively to avoid spam
            # self.report_manager.log_step(None, "PASS", f"Keyboard down: {key}") 
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "key_down_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed keyboard down {key}: {e}", path)

    def keyboard_up(self, key: str):
        try:
            self.page.keyboard.up(key)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "key_up_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed keyboard up {key}: {e}", path)

    def check_checkbox(self, selector: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            if not locator.is_checked():
                locator.check()
                # Confirm it changed
                expect(locator).to_be_checked()
                path = self.report_manager.capture_screenshot(self.page, "check_pass")
                self.report_manager.log_step(None, "PASS", f"Checked checkbox: {selector}", path)
            else:
                self.report_manager.log_step(None, "INFO", f"Checkbox already checked: {selector}")
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "check_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to check {selector}: {e}", path)
            raise e

    def uncheck_checkbox(self, selector: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            if locator.is_checked():
                locator.uncheck()
                expect(locator).not_to_be_checked()
                path = self.report_manager.capture_screenshot(self.page, "uncheck_pass")
                self.report_manager.log_step(None, "PASS", f"Unchecked checkbox: {selector}", path)
            else:
                self.report_manager.log_step(None, "INFO", f"Checkbox already unchecked: {selector}")
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "uncheck_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to uncheck {selector}: {e}", path)
            raise e

    def select_dropdown(self, selector: str, value=None, label=None, index=None):
        """
        Select option by value, label, or index.
        Supports single value/label or lists for multi-select.
        """
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            
            if value is not None:
                locator.select_option(value=value)
                desc = f"value='{value}'"
            elif label is not None:
                locator.select_option(label=label)
                desc = f"label='{label}'"
            elif index is not None:
                locator.select_option(index=index)
                desc = f"index='{index}'"
            else:
                raise ValueError("Must provide value, label, or index for dropdown selection")

            path = self.report_manager.capture_screenshot(self.page, "select_pass")
            self.report_manager.log_step(None, "PASS", f"Selected {desc} in {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "select_fail")
            self.report_manager.log_step(None, "FAIL", f"Failed to select from {selector}: {e}", path)
            raise e

    def drag_and_drop(self, source_selector: str, target_selector: str):
        try:
            self.wait_for_element(source_selector)
            self.wait_for_element(target_selector)
            
            src = self.page.locator(source_selector)
            tgt = self.page.locator(target_selector)
            
            # Highlight both
            self._highlight(src)
            self._highlight(tgt)
            
            src.drag_to(tgt)
            
            path = self.report_manager.capture_screenshot(self.page, "drag_drop_pass")
            self.report_manager.log_step(None, "PASS", f"Dragged {source_selector} to {target_selector}", path)
            
            self._remove_highlight(src)
            self._remove_highlight(tgt)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "drag_drop_fail")
            self.report_manager.log_step(None, "FAIL", f"Drag and drop failed: {e}", path)
            raise e
            
    def mouse_move(self, x: float, y: float):
        try:
            self.page.mouse.move(x, y)
        except Exception as e:
             self.report_manager.log_step(None, "FAIL", f"Mouse move failed: {e}")

    def mouse_down(self):
        try:
            self.page.mouse.down()
        except:
            pass

    def mouse_up(self):
        try:
            self.page.mouse.up()
        except:
             pass

    def mouse_wheel(self, delta_x: float, delta_y: float):
        try:
            self.page.mouse.wheel(delta_x, delta_y)
        except Exception as e:
            self.report_manager.log_step(None, "FAIL", f"Mouse wheel failed: {e}")

    def upload_file(self, selector: str, file_path_or_paths):
        """Upload one or multiple files"""
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            self._highlight(locator)
            
            locator.set_input_files(file_path_or_paths)
            
            path = self.report_manager.capture_screenshot(self.page, "upload_pass")
            self.report_manager.log_step(None, "PASS", f"Uploaded file(s) to {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "upload_fail")
            self.report_manager.log_step(None, "FAIL", f"File upload failed: {e}", path)
            raise e
            
    def download_file(self, trigger_action, expected_filename: str = None, timeout: int = 30000) -> str:
        """
        Handle a file download. 
        trigger_action: Lambda or function that performs the click/action causing download.
        Returns the path to the saved file.
        """
        try:
            with self.page.expect_download(timeout=timeout) as download_info:
                trigger_action()
            
            download = download_info.value
            # Use suggested filename if not provided
            filename = expected_filename if expected_filename else download.suggested_filename
            save_path = f"{Config.DATA_DIR}/{filename}"
            download.save_as(save_path)
            
            path = self.report_manager.capture_screenshot(self.page, "download_pass")
            self.report_manager.log_step(None, "PASS", f"Downloaded file to: {save_path}", path)
            return save_path
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "download_fail")
            self.report_manager.log_step(None, "FAIL", f"Download failed: {e}", path)
            raise e

    def take_element_screenshot(self, selector: str, name: str):
        """Capture screenshot of a specific element"""
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = f"element_{name}_{timestamp}.png"
            path = f"screenshots/{filename}"
            # Need absolute path for saving, relative for reporting
            full_path = f"{self.report_manager.output_dir}/{path}"
            locator.screenshot(path=full_path)
            self.report_manager.log_step(None, "INFO", f"Element Screenshot: {name}", path)
        except Exception as e:
             # Capture full page if element fails
             path = self.report_manager.capture_screenshot(self.page, "elem_screenshot_fail")
             self.report_manager.log_step(None, "FAIL", f"Failed element screenshot: {e}", path)

    # =================================================================================================
    #                                      VALIDATIONS
    # =================================================================================================

    def verify_element_text(self, selector: str, expected_text: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_have_text(expected_text)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_text_pass")
            self.report_manager.log_step(None, "PASS", f"Verified text '{expected_text}' in {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_text_fail")
            self.report_manager.log_step(None, "FAIL", f"Text verification failed for {selector}: {e}", path)
            raise e

    def verify_element_contains_text(self, selector: str, expected_text: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_contain_text(expected_text)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_contains_text_pass")
            self.report_manager.log_step(None, "PASS", f"Verified text contains '{expected_text}' in {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_contains_text_fail")
            self.report_manager.log_step(None, "FAIL", f"Text contains verification failed: {e}", path)
            raise e

    def verify_element_value(self, selector: str, expected_value: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_have_value(expected_value)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_value_pass")
            self.report_manager.log_step(None, "PASS", f"Verified value '{expected_value}' in {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_value_fail")
            self.report_manager.log_step(None, "FAIL", f"Value verification failed: {e}", path)
            raise e

    def verify_element_empty(self, selector: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_be_empty()
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_empty_pass")
            self.report_manager.log_step(None, "PASS", f"Verified element is empty: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_empty_fail")
            self.report_manager.log_step(None, "FAIL", f"Empty verification failed for {selector}: {e}", path)
            raise e

    def verify_element_visible(self, selector: str):
        try:
            # wait_for_element verifies visibility itself, but verify_visible ensures expect assertion usage
            locator = self.page.locator(selector)
            self._highlight(locator)
            # Capture while highlighted and visible
            path = self.report_manager.capture_screenshot(self.page, "verify_visible_target")
            expect(locator).to_be_visible()
            self.report_manager.log_step(None, "PASS", f"Verified element visible: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_visible_fail")
            self.report_manager.log_step(None, "FAIL", f"Element not visible: {selector}: {e}", path)
            raise e

    def verify_element_hidden(self, selector: str):
        try:
            locator = self.page.locator(selector)
            expect(locator).to_be_hidden()
            path = self.report_manager.capture_screenshot(self.page, "verify_hidden_pass")
            self.report_manager.log_step(None, "PASS", f"Verified element hidden: {selector}", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_hidden_fail")
            self.report_manager.log_step(None, "FAIL", f"Element not hidden: {selector}: {e}", path)
            raise e

    def verify_element_enabled(self, selector: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_be_enabled()
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_enabled_pass")
            self.report_manager.log_step(None, "PASS", f"Verified element enabled: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_enabled_fail")
            self.report_manager.log_step(None, "FAIL", f"Element not enabled: {selector}: {e}", path)
            raise e

    def verify_element_disabled(self, selector: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_be_disabled()
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_disabled_pass")
            self.report_manager.log_step(None, "PASS", f"Verified element disabled: {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_disabled_fail")
            self.report_manager.log_step(None, "FAIL", f"Element not disabled: {selector}: {e}", path)
            raise e

    def verify_element_attribute(self, selector: str, attribute: str, value: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_have_attribute(attribute, value)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_attr_pass")
            self.report_manager.log_step(None, "PASS", f"Verified {selector} has attribute {attribute}='{value}'", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_attr_fail")
            self.report_manager.log_step(None, "FAIL", f"Attribute verification failed for {selector}: {e}", path)
            raise e

    def verify_element_count(self, selector: str, expected_count: int):
        try:
            locator = self.page.locator(selector)
            # wait for at least one to be present if expecting > 0, basically ensuring element *could* exist
            # but expect(locator).to_have_count() handles waiting/retrying automatically.
            expect(locator).to_have_count(expected_count)
            
            path = self.report_manager.capture_screenshot(self.page, "verify_count_pass")
            self.report_manager.log_step(None, "PASS", f"Verified element count is {expected_count} for {selector}", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_count_fail")
            self.report_manager.log_step(None, "FAIL", f"Count verification failed: {e}", path)
            raise e

    def verify_css_property(self, selector: str, property_name: str, expected_value: str):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_have_css(property_name, expected_value)
            self._highlight(locator)
            path = self.report_manager.capture_screenshot(self.page, "verify_css_pass")
            self.report_manager.log_step(None, "PASS", f"Verified CSS property {property_name}='{expected_value}' for {selector}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_css_fail")
            self.report_manager.log_step(None, "FAIL", f"CSS verification failed for {selector}: {e}", path)
            raise e
            
    def verify_url(self, expected_url: str, partial: bool = False):
        try:
            # wait briefly for url stability
            self.page.wait_for_timeout(500)
            current = self.page.url
            if partial:
                assert expected_url in current, f"Expected '{expected_url}' in '{current}'"
            else:
                assert current == expected_url, f"Expected '{expected_url}', got '{current}'"
            path = self.report_manager.capture_screenshot(self.page, "verify_url_pass")
            self.report_manager.log_step(None, "PASS", f"Verified URL matches '{expected_url}'", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_url_fail")
            self.report_manager.log_step(None, "FAIL", f"URL verification failed: {e}", path)
            raise e

    def verify_title(self, expected_title: str):
        try:
            expect(self.page).to_have_title(expected_title)
            path = self.report_manager.capture_screenshot(self.page, "verify_title_pass")
            self.report_manager.log_step(None, "PASS", f"Verified page title: {expected_title}", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_title_fail")
            self.report_manager.log_step(None, "FAIL", f"Title verification failed: {e}", path)
            raise e
            
    def verify_aria_snapshot(self, selector, expected_snapshot):
        try:
            self.wait_for_element(selector)
            locator = self.page.locator(selector)
            expect(locator).to_match_aria_snapshot(expected_snapshot)
            path = self.report_manager.capture_screenshot(self.page, "verify_snapshot_pass")
            self.report_manager.log_step(None, "PASS", f"Verified aria snapshot for {selector}", path)
        except Exception as e:
            path = self.report_manager.capture_screenshot(self.page, "verify_snapshot_fail")
            self.report_manager.log_step(None, "FAIL", f"Snapshot verification failed for {selector}: {e}", path)
            raise e

    # =================================================================================================
    #                                      FRAMES & IFRAMES
    # =================================================================================================

    def get_frame(self, selector: str) -> FrameLocator:
        """Get a frame locator to interact with iframes"""
        return self.page.frame_locator(selector)

    # =================================================================================================
    #                                      COOKIES & STORAGE
    # =================================================================================================

    def get_cookies(self):
        return self.page.context.cookies()

    def add_cookie(self, cookie_dict: dict):
        self.page.context.add_cookies([cookie_dict])

    def clear_cookies(self):
        self.page.context.clear_cookies()

    # =================================================================================================
    #                                      ADVANCED & SCRIPTS
    # =================================================================================================

    def evaluate_script(self, script: str, arg=None):
        return self.page.evaluate(script, arg)
        
    # =================================================================================================
    #                                      BROWSER & NETWORK
    # =================================================================================================

    def handle_alert(self, action: str = "accept", prompt_text: str = None):
        """
        Set up a one-time dialog handler. call BEFORE the action that triggers the alert.
        action: 'accept' or 'dismiss'
        """
        def dialog_handler(dialog):
            msg = dialog.message
            if prompt_text:
                dialog.accept(prompt_text)
            elif action == "accept":
                dialog.accept()
            else:
                dialog.dismiss()
            # Alerts don't stay on screen, so screenshot might miss it or catch next state
            path = self.report_manager.capture_screenshot(self.page, "alert_handled")
            self.report_manager.log_step(None, "INFO", f"Handled Alert: {msg} with {action}", path)

        self.page.once("dialog", dialog_handler)

    def verify_console_errors(self):
        """Checks if any console errors occurred (placeholder - requires listener setup)"""
        # Monitoring console requires setting up a listener at test start. 
        # Here we just log a message that this feature requires setup.
        pass 
        
    def wait_for_network_idle(self, timeout: int = 5000):
        try:
            self.page.wait_for_load_state("networkidle", timeout=timeout)
        except:
            self.report_manager.log_step(None, "WARN", "Network idle timeout reached")

    # =================================================================================================
    #                                      POPUP & DYNAMIC HELPERS
    # =================================================================================================

    def _get_locator_with_filter(self, parent, selector: str, filter_expr: str):
        """Helper to apply .first, .last, .nth(N) filters to a locator"""
        loc = parent.locator(selector)
        if filter_expr == '.first':
            return loc.first
        elif filter_expr == '.last':
            return loc.last
        elif filter_expr.startswith('.nth('):
            try:
                index = int(filter_expr.split('(')[1].split(')')[0])
                return loc.nth(index)
            except Exception as e:
                pass
        return loc

    def _popup_click(self, popup_page, selector: str, filter_expr: str, locator_name: str):
        """Click on popup with extent reporting"""
        try:
            # Explicit wait for popup element
            timeout = Config.TIMEOUT
            popup_page.wait_for_selector(selector, state="visible", timeout=timeout)
            
            locator = self._get_locator_with_filter(popup_page, selector, filter_expr)
            self._highlight(locator)
            locator.click()
            path = self.report_manager.capture_screenshot(popup_page, 'popup_click_pass')
            self.report_manager.log_step(None, 'PASS', f'Clicked popup element: {locator_name}', path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(popup_page, 'popup_click_fail')
            self.report_manager.log_step(None, 'FAIL', f'Failed to click popup {locator_name}: {str(e)}', path)
            raise e

    def _popup_fill(self, popup_page, selector: str, filter_expr: str, text: str, locator_name: str):
        """Fill text in popup with extent reporting"""
        try:
            # Explicit wait
            timeout = Config.TIMEOUT
            popup_page.wait_for_selector(selector, state="visible", timeout=timeout)

            locator = self._get_locator_with_filter(popup_page, selector, filter_expr)
            self._highlight(locator)
            locator.fill(text)
            path = self.report_manager.capture_screenshot(popup_page, 'popup_fill_pass')
            self.report_manager.log_step(None, 'PASS', f"Filled '{text}' in popup element: {locator_name}", path)
            self._remove_highlight(locator)
        except Exception as e:
            path = self.report_manager.capture_screenshot(popup_page, 'popup_fill_fail')
            self.report_manager.log_step(None, 'FAIL', f'Failed to fill popup {locator_name}: {str(e)}', path)
            raise e

    def _popup_verify_text(self, popup_page, selector: str, filter_expr: str, expected_text: str, locator_name: str):
        """Verify text in popup with extent reporting"""
        try:
            # Explicit wait
            timeout = Config.TIMEOUT
            popup_page.wait_for_selector(selector, state="visible", timeout=timeout)

            locator = self._get_locator_with_filter(popup_page, selector, filter_expr)
            self._highlight(locator)
            expect(locator).to_contain_text(expected_text)

            path = self.report_manager.capture_screenshot(popup_page, 'popup_verify_pass')
            self.report_manager.log_step(None, 'PASS', f"Verified text '{expected_text}' in popup: {locator_name}", path)

            self._remove_highlight(locator)

        except Exception as e:
            path = self.report_manager.capture_screenshot(popup_page, 'popup_verify_fail')
            self.report_manager.log_step(None, 'FAIL', f"Text verification failed for popup {locator_name}: {str(e)}", path)
            raise e
    @contextmanager
    def handle_popup(self):
        """
        Context manager to handle popup windows.
        Usage:
        with self.handle_popup() as popup_page:
            self.click(BUTTON_THAT_OPENS_POPUP)
        # popup_page can be used after the with block if needed, 
        # but usually you interact with it inside or via popup_info
        """
        with self.page.expect_popup() as popup_info:
            yield popup_info
