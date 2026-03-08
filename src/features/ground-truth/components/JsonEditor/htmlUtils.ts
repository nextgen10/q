import { saveAs } from 'file-saver';
import { Value } from './types';

/**
 * EXPORT FORM AS HTML
 * Completely re-engineered for 100% parity with the Generated Form tab.
 */
export const handleExportHtml = (data: Value | null, schema: Value | null, templateName: string = "Ground Truth Form") => {
    // Escape backticks in strings to prevent breaking the template literal
    // We use \u0060 for JSON strings to stay JSON-compatible while avoiding backticks in the TS template
    // Base64 encode JSON using browser-native APIs (no Node Buffer dependency).
    const toB64 = (obj: Value | null) => {
        const json = JSON.stringify(obj || {});
        try {
            const bytes = new TextEncoder().encode(json);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
        } catch {
            return btoa(unescape(encodeURIComponent(json)));
        }
    };

    const jsonBase64 = toB64(data);
    const schemaBase64 = toB64(schema);
    const resolvedTemplateName = templateName || "Ground Truth Form";
    const safeTemplateName = resolvedTemplateName
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const fileBaseName = resolvedTemplateName.replace(/\s+/g, '_');
    const escapedFileBaseForJs = JSON.stringify(fileBaseName);
    const fileName = `${fileBaseName}.html`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTemplateName} - Ground Truth Portable</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4f46e5;
            --secondary: #ec4899;
            --bg: #f8fafc;
            --surface: #ffffff;
            --border: #e2e8f0;
            --text: #0f172a;
            --text-muted: #64748b;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
        }
        
        body { font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; line-height: 1.5; }
        .page { max-width: 1200px; margin: 40px auto; background: var(--surface); padding: 40px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }
        
        header { 
            display: flex; justify-content: space-between; align-items: flex-start; 
            border-bottom: 2px solid var(--border); padding-bottom: 24px; margin-bottom: 40px; 
            position: sticky; top: 0; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); z-index: 1000; 
        }
        .brand h1 { margin: 0; font-size: 32px; font-weight: 800; color: var(--text); text-transform: capitalize; letter-spacing: -0.02em; }
        .brand .caption { font-size: 14px; font-weight: 700; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
        .brand .caption b { color: var(--secondary); background: rgba(236, 72, 153, 0.1); padding: 2px 8px; border-radius: 6px; }
        
        .controls { display: flex; gap: 12px; align-items: center; margin-top: 10px; }
        .btn { padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; font-family: inherit; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .btn-primary { background: var(--primary); color: white; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.5); }
        .btn-outline { background: white; color: var(--text-muted); border: 2px solid var(--border); }
        .btn-outline:hover { background: var(--bg); color: var(--text); border-color: var(--text-muted); }
        
        /* Staircase Layout */
        .node { margin-left: 20px; border-left: 2px solid var(--border); padding-left: 24px; margin-top: 12px; position: relative; transition: all 0.3s ease; }
        .node.level-0 { border-left: 2px solid #3b82f6; }
        .node.level-1 { border-left: 2px solid #10b981; }
        .node.level-2 { border-left: 2px solid #f59e0b; }
        .node.level-3 { border-left: 2px solid #8b5cf6; }
        .node.level-4 { border-left: 2px solid #ec4899; }
        .node.level-5 { border-left: 2px solid #6366f1; }
        
        .node-header { 
            display: flex; align-items: center; gap: 12px; font-weight: 700; padding: 12px 16px; 
            border-radius: 12px; cursor: pointer; user-select: none; transition: background 0.2s; 
        }
        .node-header:hover { background: rgba(0,0,0,0.02); }
        .toggle { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 8px; transition: transform 0.2s; font-size: 12px; }
        .collapsed > .node-content { display: none; }
        .collapsed > .node-header .toggle { transform: rotate(-90deg); }
        
        /* Form Controls */
        .field { display: flex; align-items: center; gap: 20px; padding: 12px 16px; border-radius: 12px; transition: background 0.2s; margin-bottom: 8px; }
        .field:hover { background: #f8fafc; }
        .field-label { width: 220px; min-width: 220px; font-size: 14px; color: var(--text-muted); font-weight: 600; text-transform: capitalize; }
        
        .input-group { flex: 1; display: flex; align-items: center; gap: 12px; }
        input[type="text"], input[type="number"] { 
            width: 100%; padding: 10px 16px; border: 2px solid var(--border); border-radius: 12px; 
            outline: none; transition: all 0.2s; font-family: inherit; font-size: 14px; background: white; 
        }
        input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        
        /* Switch styling */
        .switch-wrap { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--success); }
        input:checked + .slider:before { transform: translateX(20px); }

        .btn-action { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: none; cursor: pointer; transition: all 0.2s; }
        .btn-remove { background: #fee2e2; color: var(--error); border: 1px solid #fecaca; }
        .btn-remove:hover { background: var(--error); color: white; }
        
        .add-placeholder { 
            margin: 16px 0 16px 0; border: 2px dashed var(--border); border-radius: 16px; 
            padding: 16px; color: var(--primary); font-weight: 700; cursor: pointer; 
            text-align: center; transition: all 0.2s; font-size: 14px;
        }
        .add-placeholder:hover { border-color: var(--primary); background: #f5f3ff; transform: scale(1.01); }

        /* Table View */
        .table-wrap { margin: 16px 0 8px 0; border: 2px solid var(--border); border-radius: 20px; overflow: hidden; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow-x: auto; }
        table { width: 100%; min-width: 600px; border-collapse: collapse; table-layout: auto; }
        th { background: #f8fafc; color: var(--text-muted); padding: 16px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid var(--border); white-space: nowrap; }
        td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fcfcfd; }
        .table-input { border: 1px solid transparent !important; background: transparent !important; padding: 6px !important; border-radius: 6px !important; width: 100% !important; }
        .table-input:focus { border-color: var(--border) !important; background: white !important; }

        .footer { margin-top: 80px; text-align: center; font-size: 14px; color: var(--text-muted); padding: 40px 0; border-top: 2px solid var(--border); }
        
        /* Validation States */
        input.invalid { border-color: var(--error) !important; background: #fff1f2 !important; }
        .type-hint { font-size: 10px; font-weight: 800; color: var(--text-muted); opacity: 0.6; margin-left: 8px; text-transform: uppercase; }
        
        .prop-adder { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 8px 16px; border-top: 1px dashed var(--border); }
        .prop-select { flex: 1; padding: 6px 12px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; outline: none; }
        .btn-add-prop { background: var(--primary); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px; }
        
        #json-modal, #import-modal { 
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center; 
            backdrop-filter: blur(4px);
        }
        .modal-content { 
            background: white; padding: 32px; border-radius: 24px; width: 80%; max-width: 800px; 
            max-height: 80vh; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            position: relative;
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; }
        .modal-header h2 { margin: 0; font-size: 24px; font-weight: 800; }
        .modal-body { flex: 1; overflow: auto; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
        pre, textarea { margin: 0; font-family: 'Courier New', monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all; color: #334155; }
        textarea { width: 100%; min-height: 150px; padding: 12px; border: 1px solid var(--border); border-radius: 10px; outline: none; resize: vertical; }
        textarea:focus { border-color: var(--primary); }
        .input-label { font-weight: 700; font-size: 12px; color: var(--text-muted); text-transform: uppercase; }
        
        #search-box { padding: 10px 16px; border: 2px solid var(--border); border-radius: 12px; width: 250px; font-family: inherit; font-size: 14px; }
        #error-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; background: var(--error); color: white; padding: 10px; text-align: center; z-index: 9999; }
    </style>
</head>
<body>
    <div id="error-overlay"></div>
    
    <!-- Import Modal -->
    <div id="import-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Load Workspace</h2>
                <button class="btn btn-outline" style="padding: 5px 12px;" onclick="closeImportModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div class="input-label" style="margin:0">Data JSON</div>
                        <button class="btn btn-outline" style="padding: 2px 8px; font-size: 10px;" onclick="document.getElementById('import-data-text').value='{}'">Clear</button>
                    </div>
                    <textarea id="import-data-text" placeholder="Paste your data JSON here..."></textarea>
                </div>
                <div>
                     <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div class="input-label" style="margin:0">Schema JSON (Optional)</div>
                        <button class="btn btn-outline" style="padding: 2px 8px; font-size: 10px;" onclick="document.getElementById('import-schema-text').value='{}'">Clear</button>
                    </div>
                    <textarea id="import-schema-text" placeholder="Paste your schema JSON here..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeImportModal()">Cancel</button>
                <button class="btn btn-primary" onclick="confirmImport()">Load & Render</button>
            </div>
        </div>
    </div>
    <!-- JSON Modal -->
    <div id="json-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Generated JSON</h2>
                <button class="btn btn-outline" style="padding: 5px 12px;" onclick="closeJsonModal()">&times;</button>
            </div>
            <div class="modal-body">
                <pre id="json-display"></pre>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="copyJson(this)">Copy to Clipboard</button>
                <button class="btn btn-primary" onclick="downloadJson()">Download .json</button>
                <button class="btn btn-outline" onclick="closeJsonModal()">Close</button>
            </div>
        </div>
    </div>
    <div class="page">
        <header>
            <div class="brand">
                <h1>${safeTemplateName}</h1>
                <span class="caption">Ground Truth <b>Portable</b></span>
            </div>
            <div class="controls">
                <input type="text" id="search-box" placeholder="Search fields..." oninput="filterForm(this.value)">
                <button class="btn btn-outline" onclick="showImportModal()">Load Workspace</button>
                <button class="btn btn-outline" onclick="expandAll(true)">Expand All</button>
                <button class="btn btn-outline" onclick="expandAll(false)">Collapse All</button>
                <button class="btn btn-outline" style="border-color: var(--primary); color: var(--primary);" onclick="showJsonModal()">Generate JSON</button>
                <button class="btn btn-primary" onclick="requestSync()">Sync & Download</button>
            </div>
        </header>
        <div id="mount"><div style="padding: 40px; text-align: center; opacity: 0.5;">Loading Editor...</div></div>
        <div class="footer">
            <p><strong>Portable Editor v5.1</strong> • Full Parity Engine</p>
        </div>
    </div>

    <script id="gt-data" type="text/plain">${jsonBase64}</script>
    <script id="gt-schema" type="text/plain">${schemaBase64}</script>

    <script>
        // 1. EARLY ERROR CATCHING
        window.onerror = function(msg, url, line) {
            var err = document.getElementById('error-overlay');
            if (err) {
                err.style.display = 'block';
                err.textContent = 'Critical Error: ' + msg + ' (Line ' + line + ')';
            }
            console.error(msg, line);
        };

        // 2. STATE & HELPERS
        var store = {}, signature = {};
        var expandedPaths = new Set(['root']);
        var isLoaded = false;

        function toB64(str) {
            try {
                var bytes = new TextEncoder().encode(str);
                var binary = '';
                for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                return btoa(binary);
            } catch(e) { return btoa(unescape(encodeURIComponent(str))); }
        }

        function fromB64(b64) {
            try {
                var binary = atob(b64.trim());
                var bytes = new Uint8Array(binary.length);
                for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return new TextDecoder().decode(bytes);
            } catch(e) { return decodeURIComponent(escape(atob(b64.trim()))); }
        }

        // 3. WATCHDOG
        setTimeout(function() {
            if (!isLoaded) {
                var mount = document.getElementById('mount');
                if (mount && (mount.innerText.includes('Loading') || mount.innerText.includes('Initializing'))) {
                    mount.innerHTML = '<div style="padding:40px; color:var(--error); text-align:center; border:2px solid var(--error); border-radius:12px;">' +
                        '<h3>Engine Stalled</h3><p>The form script encountered a problem and could not start.</p>' +
                        '<button onclick="location.reload()" style="padding:10px 20px; margin-top:10px; cursor:pointer;">Retry</button>' +
                        '</div>';
                }
            }
        }, 4000);

        function init() {
            var mount = document.getElementById('mount');
            if (mount) mount.innerHTML = '<div style="padding:40px; text-align:center; opacity:0.5;">Initializing engine...</div>';
            
            try {
                var dataEl = document.getElementById('gt-data');
                var schemaEl = document.getElementById('gt-schema');
                
                if (!dataEl || !schemaEl) throw new Error('Data storage elements missing.');

                store = JSON.parse(fromB64(dataEl.textContent));
                signature = JSON.parse(fromB64(schemaEl.textContent));
                
                isLoaded = true;
                refreshUI();
            } catch (e) {
                if (mount) mount.innerHTML = '<div style="padding:40px; color:var(--error); text-align:center; border:2px dashed var(--error); border-radius:20px;">' +
                    '<h3>Initialization Failed</h3><p>' + e.message + '</p></div>';
            }
        }

        function refreshUI() {
            const mount = document.getElementById('mount');
            if (!mount) return;
            
            const scrollPos = window.scrollY;
            const currentHeight = mount.offsetHeight;
            mount.style.minHeight = currentHeight + 'px';

            mount.innerHTML = '';
            renderBranch(mount, store, signature, [], 0);
            
            // Fallback for empty workspace
            if (mount.innerHTML === '') {
                const welcome = document.createElement('div');
                welcome.style.padding = '80px 40px';
                welcome.style.textAlign = 'center';
                welcome.style.opacity = '0.5';
                welcome.innerHTML = '<h2 style="margin:0">Empty Workspace</h2><p>Click "Load Workspace" to paste JSON & Schema.</p>';
                mount.appendChild(welcome);
            }
            
            // Re-apply search filter if active
            const searchBox = document.getElementById('search-box');
            if (searchBox && searchBox.value) {
                filterForm(searchBox.value);
            }

            // Wait for layout to settle before releasing height lock and restoring scroll
            requestAnimationFrame(() => {
                mount.style.minHeight = '';
                window.scrollTo(0, scrollPos);
            });
        }

        function renderBranch(parent, currentData, currentSchema, path, level) {
            if (!currentData && !currentSchema) return;

            const isArray = Array.isArray(currentData) || Array.isArray(currentSchema) || 
                            (currentSchema && (currentSchema.type === 'array' || currentSchema.items));
            
            const isObject = !isArray && (
                (currentData !== null && typeof currentData === 'object') || 
                (currentSchema !== null && typeof currentSchema === 'object') ||
                (currentSchema && (currentSchema.type === 'object' || currentSchema.properties))
            );

            if (isArray) {
                const arrayData = Array.isArray(currentData) ? currentData : [];
                let arraySchema = null;
                if (Array.isArray(currentSchema) && currentSchema.length > 0) arraySchema = currentSchema[0];
                else if (currentSchema && currentSchema.items) arraySchema = currentSchema.items;

                let isTable = false;
                if (arrayData.length > 0) {
                    isTable = arrayData.every(it => it && typeof it === 'object' && !Array.isArray(it)) &&
                             arrayData.every(it => Object.values(it).every(v => v === null || typeof v !== 'object'));
                } else if (arraySchema && typeof arraySchema === 'object' && !Array.isArray(arraySchema)) {
                    isTable = Object.values(arraySchema).every(v => v === null || typeof v !== 'object');
                }

                const label = path.length === 0 ? "Root Array" : path[path.length-1];
                const pathStr = path.length === 0 ? 'root' : path.join('.');
                const node = createNode(parent, label, path, level);
                const content = node.querySelector('.node-content');
                
                if (arrayData.length === 0) {
                    node.classList.remove('collapsed');
                    expandedPaths.add(pathStr);
                }

                if (isTable) {
                    renderTable(content, arrayData, arraySchema, path);
                } else {
                    arrayData.forEach((item, idx) => {
                        const itemNode = createNode(content, 'Item ' + (idx+1), [...path, idx], level + 1);
                        renderBranch(itemNode.querySelector('.node-content'), item, arraySchema, [...path, idx], level + 1);
                    });
                    content.appendChild(createAddZone(path, arraySchema));
                }
            } else if (isObject) {
                let sKeys = [];
                if (currentSchema && typeof currentSchema === 'object') {
                    sKeys = currentSchema.properties ? Object.keys(currentSchema.properties) : Object.keys(currentSchema);
                }
                const dKeys = (currentData && typeof currentData === 'object') ? Object.keys(currentData) : [];
                const keys = Array.from(new Set([...sKeys, ...dKeys]));

                const isArrayItem = path.length > 0 && typeof path[path.length - 1] === 'number';
                const needsNode = path.length > 0 && !isArrayItem;

                const branchContainer = needsNode 
                    ? createNode(parent, path[path.length-1], path, level)
                    : parent;
                
                const content = needsNode ? branchContainer.querySelector('.node-content') : parent;

                keys.forEach(key => {
                    const valData = currentData ? currentData[key] : undefined;
                    let valSchema = currentSchema ? currentSchema[key] : undefined;
                    if (!valSchema && currentSchema && currentSchema.properties) valSchema = currentSchema.properties[key];
                    
                    const valFinal = valData !== undefined ? valData : valSchema;
                    const childIsArray = Array.isArray(valFinal) || (valSchema && (valSchema.type === 'array' || valSchema.items));
                    const childIsObject = !childIsArray && valFinal !== null && typeof valFinal === 'object';

                    // Only render if it exists in data OR if it's explicitly in schema (dynamic skeleton)
                    if (valData !== undefined || valSchema !== undefined) {
                        if (childIsArray || childIsObject) {
                            renderBranch(content, valData, valSchema, [...path, key], level + (needsNode ? 1 : 0));
                        } else {
                            renderField(content, key, valData !== undefined ? valData : "", path, level + (needsNode ? 1 : 0), false, valSchema);
                        }
                    }
                });

                // Add Property Zone for Objects
                if (sKeys.length > 0) {
                    const missingKeys = sKeys.filter(k => !dKeys.includes(k));
                    if (missingKeys.length > 0) {
                        content.appendChild(createPropAdder(path, missingKeys, currentSchema));
                    }
                }
            } else {
                const leafKey = path[path.length - 1];
                const parentPath = path.slice(0, -1);
                renderField(parent, leafKey, currentData, parentPath, level, true, currentSchema);
            }
        }

        function createPropAdder(path, keys, fullSchema) {
            const div = document.createElement('div'); div.className = 'prop-adder';
            const select = document.createElement('select'); select.className = 'prop-select';
            keys.forEach(k => {
                const opt = document.createElement('option'); opt.value = k; opt.textContent = 'Add ' + k;
                select.appendChild(opt);
            });
            const btn = document.createElement('button'); btn.className = 'btn-add-prop'; btn.textContent = 'Add Field';
            btn.onclick = (e) => {
                e.stopPropagation();
                const key = select.value;
                let schema = fullSchema[key];
                if (!schema && fullSchema.properties) schema = fullSchema.properties[key];
                addProperty(path, key, schema);
            };
            div.appendChild(select); div.appendChild(btn);
            return div;
        }

        function addProperty(path, key, schema) {
            let curr = store;
            path.forEach(p => curr = curr[p]);
            curr[key] = generateFromSchema(schema);
            refreshUI();
        }

        function generateFromSchema(s) {
            if (!s) return "";
            const type = s.type || (typeof s === 'string' ? s : 'string');
            if (type === 'string') return "";
            if (type === 'number') return 0;
            if (type === 'boolean') return false;
            if (type === 'array' || s.items) return [];
            if (type === 'object' || s.properties) {
                const o = {};
                const props = s.properties || s;
                Object.keys(props).forEach(k => o[k] = generateFromSchema(props[k]));
                return o;
            }
            return "";
        }

        function createNode(parent, label, path, level) {
            const pathStr = path.length === 0 ? 'root' : path.join('.');
            const div = document.createElement('div');
            div.className = 'node level-' + (level % 6);
            div.dataset.path = pathStr;
            div.dataset.label = String(label).toLowerCase();
            
            // Restore expanded state
            if (!expandedPaths.has(pathStr)) {
                div.classList.add('collapsed');
            }

            const header = document.createElement('div');
            header.className = 'node-header';
            const toggle = document.createElement('div');
            toggle.className = 'toggle'; toggle.textContent = '▼';
            const lbl = document.createElement('span'); lbl.textContent = label; lbl.style.flex = "1";
            header.appendChild(toggle); header.appendChild(lbl);

            const type = path.length > 0 && typeof path[path.length - 1] === 'number' ? 'item' : 'section';

            if (type === 'item') {
                const rm = document.createElement('button');
                rm.className = 'btn-action btn-remove'; rm.innerHTML = '&times;'; rm.style.marginLeft = "12px";
                rm.onclick = (e) => { e.stopPropagation(); if (confirm('Remove item?')) removeItem(path.slice(0, -1), path[path.length - 1]); };
                header.appendChild(rm);
            }

            header.onclick = () => {
                div.classList.toggle('collapsed');
                if (div.classList.contains('collapsed')) {
                    expandedPaths.delete(pathStr);
                } else {
                    expandedPaths.add(pathStr);
                }
            };

            const content = document.createElement('div'); content.className = 'node-content';
            div.appendChild(header); div.appendChild(content); parent.appendChild(div);
            return div;
        }

        function renderField(parent, label, value, path, level, isLeafItem = false, schema = null) {
            const div = document.createElement('div'); div.className = 'field';
            div.dataset.label = String(label).toLowerCase();
            const lbl = document.createElement('div'); lbl.className = 'field-label';
            lbl.textContent = label;
            
            // Determine type from schema or value
            let type = schema ? (schema.type || (typeof schema === 'string' ? schema : null)) : null;
            if (!type && value !== null && value !== undefined) type = typeof value;
            if (!type) type = 'string'; // Default fallback

            if (type) {
                const hint = document.createElement('span'); hint.className = 'type-hint'; hint.textContent = type;
                lbl.appendChild(hint);
            }
            
            if (isLeafItem || !isNaN(label)) lbl.style.display = 'none';

            const group = document.createElement('div'); group.className = 'input-group';

            if (type === 'boolean' || typeof value === 'boolean') {
                const swWrap = document.createElement('label'); swWrap.className = 'switch-wrap';
                const sw = document.createElement('div'); sw.className = 'switch';
                const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!value;
                input.onchange = (e) => { updateValue(path, label, e.target.checked); refreshUI(); };
                const slider = document.createElement('span'); slider.className = 'slider';
                sw.appendChild(input); sw.appendChild(slider);
                const txt = document.createElement('span'); txt.style.fontSize = '14px'; txt.textContent = value ? 'True' : 'False';
                swWrap.appendChild(sw); swWrap.appendChild(txt); group.appendChild(swWrap);
            } else {
                const input = document.createElement('input');
                input.className = 'val-input';
                input.type = (type === 'number' || typeof value === 'number') ? 'number' : 'text';
                input.value = (value === null || value === undefined) ? '' : value;
                input.setAttribute('value', input.value);
                
                input.oninput = (e) => {
                    let val = e.target.value;
                    input.setAttribute('value', val);
                    
                    // Basic Validation
                    if (input.type === 'number') {
                        const parsed = parseFloat(val);
                        if (isNaN(parsed) && val !== "") input.classList.add('invalid');
                        else {
                            input.classList.remove('invalid');
                            val = parsed;
                        }
                    }
                    updateValue(path, label, val);
                };
                group.appendChild(input);
            }
            div.appendChild(lbl); div.appendChild(group); parent.appendChild(div);
        }

        function renderTable(parent, list, rowSchema, path) {
            const kFromSchema = (rowSchema && typeof rowSchema === 'object') ? Object.keys(rowSchema) : [];
            const kFromData = list.flatMap(it => it ? Object.keys(it) : []);
            const tableKeys = Array.from(new Set([...kFromSchema, ...kFromData]));
            
            if (tableKeys.length === 0) {
                const div = document.createElement('div'); div.style.padding = '12px 44px'; div.style.fontStyle = 'italic';
                div.textContent = 'Empty - add items below.'; parent.appendChild(div);
                parent.appendChild(createAddZone(path, rowSchema)); return;
            }

            const wrap = document.createElement('div'); wrap.className = 'table-wrap';
            const table = document.createElement('table');
            const thead = document.createElement('thead'); const trh = document.createElement('tr');
            tableKeys.forEach(k => { const th = document.createElement('th'); th.textContent = k; trh.appendChild(th); });
            trh.innerHTML += '<th style="width: 50px"></th>'; thead.appendChild(trh); table.appendChild(thead);
            const tbody = document.createElement('tbody');
            list.forEach((item, idx) => {
                const tr = document.createElement('tr');
                tableKeys.forEach(k => {
                    const td = document.createElement('td');
                    const val = item ? item[k] : undefined;
                    const input = document.createElement('input'); input.className = 'table-input';
                    input.type = typeof val === 'number' ? 'number' : 'text';
                    input.value = (val === null || val === undefined) ? '' : val;
                    input.setAttribute('value', input.value); // Mirror to attribute
                    input.oninput = (e) => { 
                        let v = e.target.value; 
                        input.setAttribute('value', v); // Always mirror to attribute
                        if (input.type === 'number') v = parseFloat(v); 
                        updateValue([...path, idx], k, v); 
                    };
                    td.appendChild(input); tr.appendChild(td);
                });
                const tdOps = document.createElement('td'); 
                const rmBtn = document.createElement('button'); rmBtn.className = 'btn-action btn-remove'; rmBtn.innerHTML = '&times;';
                rmBtn.onclick = (e) => { e.stopPropagation(); if (confirm('Delete row?')) removeItem(path, idx); };
                tdOps.appendChild(rmBtn); tr.appendChild(tdOps); tbody.appendChild(tr);
            });
            table.appendChild(tbody); wrap.appendChild(table); parent.appendChild(wrap);
            parent.appendChild(createAddZone(path, rowSchema));
        }

        function createAddZone(path, schemaTemplate) {
            const div = document.createElement('div'); div.className = 'add-placeholder';
            div.textContent = '+ Add New Item';
            div.onclick = (e) => { e.stopPropagation(); addItem(path, schemaTemplate); };
            return div;
        }

        function updateValue(path, key, val) {
            let curr = store;
            // Iterate through the parent path
            for (let i = 0; i < path.length; i++) {
                const p = path[i];
                const part = isNaN(p) ? p : parseInt(p);
                
                if (curr[part] === undefined) {
                    // Peek at NEXT part to decide if we need [] or {}
                    const nextP = (i < path.length - 1) ? path[i + 1] : key;
                    curr[part] = !isNaN(nextP) ? [] : {};
                }
                curr = curr[part];
            }

            // Final Assignment
            const finalKey = isNaN(key) ? key : parseInt(key);
            curr[finalKey] = val;
            
            // Only refresh UI for booleans (switches) to avoid losing focus on text inputs
            if (typeof val === 'boolean') refreshUI(); 
        }

        function addItem(path, template) {
            let curr = store;
            for (let i = 0; i < path.length; i++) {
                const p = path[i];
                const part = isNaN(p) ? p : parseInt(p);
                if (curr[part] === undefined) {
                    const nextP = (i < path.length - 1) ? path[i + 1] : 0;
                    curr[part] = !isNaN(nextP) ? [] : {};
                }
                curr = curr[part];
            }
            
            let newItem;
            if (Array.isArray(curr) && curr.length > 0) {
                // Copy deep data from the previous item
                newItem = JSON.parse(JSON.stringify(curr[curr.length - 1]));
            } else {
                newItem = generateFromSchema(template);
            }

            if (Array.isArray(curr)) {
                curr.push(newItem);
                const parentPath = path.length === 0 ? 'root' : path.join('.');
                expandedPaths.add(parentPath);
                expandedPaths.add(parentPath + '.' + (curr.length - 1));
            }
            refreshUI();
        }

        function removeItem(path, index) {
            let curr = store; path.forEach(p => curr = curr[p]); curr.splice(index, 1); refreshUI();
        }

        function expandAll(v) { 
            document.querySelectorAll('.node').forEach(div => {
                const pathStr = div.dataset.path;
                if (v) {
                    div.classList.remove('collapsed');
                    expandedPaths.add(pathStr);
                } else {
                    div.classList.add('collapsed');
                    expandedPaths.delete(pathStr);
                }
            });
        }

        const normalize = (s) => String(s).toLowerCase().replace(/[_\\s-]/g, '');

        function deepSearch(data, query, label) {
            const q = normalize(query);
            if (normalize(label).includes(q)) return true;
            if (data === null || data === undefined) return false;
            
            if (typeof data !== 'object') {
                return normalize(data).includes(q);
            }

            if (Array.isArray(data)) {
                return data.some((item, idx) => deepSearch(item, query, 'Item ' + (idx + 1)));
            }

            return Object.entries(data).some(([k, v]) => deepSearch(v, query, k));
        }

        function filterForm(q) {
            const query = q.toLowerCase();
            const mount = document.getElementById('mount');
            if (!mount) return;

            const allNodes = mount.querySelectorAll('.node');
            const allFields = mount.querySelectorAll('.field');
            
            if (!query) {
                allNodes.forEach(el => el.style.display = '');
                allFields.forEach(el => el.style.display = '');
                return;
            }

            // Simple approach: Iterate through all rendered elements
            // and use deepSearch on the underlying data segment
            allNodes.forEach(node => {
                const pathStr = node.dataset.path;
                const path = pathStr === 'root' ? [] : pathStr.split('.').map(p => isNaN(p) ? p : parseInt(p));
                
                // Get the data segment for this path
                let segment = store;
                path.forEach(p => segment = segment ? segment[p] : undefined);
                
                const label = node.dataset.label;
                const matches = deepSearch(segment, query, label);
                
                if (matches) {
                    node.style.display = '';
                    if (normalize(label).includes(normalize(query))) {
                        // If the node itself matches, expand it and show everything inside
                        node.classList.remove('collapsed');
                        expandedPaths.add(pathStr);
                        node.querySelectorAll('.node, .field').forEach(child => child.style.display = '');
                    } else {
                        // If it's just a container for a deep match, expand it
                        node.classList.remove('collapsed');
                        expandedPaths.add(pathStr);
                    }
                } else {
                    node.style.display = 'none';
                }
            });

            allFields.forEach(field => {
                const label = field.dataset.label;
                const valInput = field.querySelector('input');
                const val = valInput ? valInput.value : '';
                
                const matches = normalize(label).includes(normalize(query)) || normalize(val).includes(normalize(query));
                field.style.display = matches ? '' : 'none';
            });
        }

        function showImportModal() {
            // We don't pre-fill large strings to avoid hangs.
            // Just show the modal ready for paste.
            document.getElementById('import-modal').style.display = 'flex';
        }

        function closeImportModal() {
            document.getElementById('import-modal').style.display = 'none';
        }

        function confirmImport() {
            try {
                const dataText = document.getElementById('import-data-text').value.trim();
                const schemaText = document.getElementById('import-schema-text').value.trim();
                
                if (dataText) {
                    store = JSON.parse(dataText);
                } else {
                    store = {};
                }
                
                if (schemaText) {
                    signature = JSON.parse(schemaText);
                } else {
                    signature = {};
                }

                // Update underlying script tags for future requestSync operations
                document.getElementById('gt-data').textContent = toB64(JSON.stringify(store));
                document.getElementById('gt-schema').textContent = toB64(JSON.stringify(signature));

                expandedPaths = new Set(['root']);
                refreshUI();
                closeImportModal();
            } catch (e) {
                alert('Invalid JSON! Please check your input.\\n\\nError: ' + e.message);
            }
        }

        function showJsonModal() {
            // Force blur on any active input to ensure val is committed
            if (document.activeElement) document.activeElement.blur();
            
            const display = document.getElementById('json-display');
            display.textContent = JSON.stringify(store, null, 2);
            document.getElementById('json-modal').style.display = 'flex';
        }

        function closeJsonModal() {
            document.getElementById('json-modal').style.display = 'none';
        }

        function copyJson(btn) {
            const text = JSON.stringify(store, null, 2);
            navigator.clipboard.writeText(text).then(() => {
                const oldText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = oldText, 2000);
            });
        }

        function downloadJson() {
            const text = JSON.stringify(store, null, 2);
            const blob = new Blob([text], { type: 'application/json' });
            const exportBase = ${escapedFileBaseForJs};
            saveAs(blob, exportBase + '_data.json');
        }

        function requestSync() {
            // Force blur on any active input to ensure val is committed
            if (document.activeElement) document.activeElement.blur();

            // CRITICAL: Mirror all live DOM values to HTML attributes for the snapshot
            document.querySelectorAll('input').forEach(input => {
                input.setAttribute('value', input.value);
                if (input.type === 'checkbox') {
                    if (input.checked) input.setAttribute('checked', '');
                    else input.removeAttribute('checked');
                }
            });

            document.getElementById('gt-data').textContent = toB64(JSON.stringify(store));
            document.getElementById('gt-schema').textContent = toB64(JSON.stringify(signature));
            const content = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
            const blob = new Blob([content], { type: 'text/html' });
            saveAs(blob, 'GroundTruth_Portable_Update.html');
        }

        function saveAs(blob, name) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    saveAs(blob, fileName);
};

/**
 * IMPORT HTML
 */
export const handleImportHtml = async (file: File) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const doc = new DOMParser().parseFromString(text, 'text/html');
                const dataScript = doc.getElementById('gt-data');
                const schemaScript = doc.getElementById('gt-schema');

                if (!dataScript) {
                    // Fallback: try to find the script tags manually if DOMParser failed
                    const dataMatch = text.match(/<script id="gt-data" [^>]*>([\s\S]*?)<\/script>/);
                    const schemaMatch = text.match(/<script id="gt-schema" [^>]*>([\s\S]*?)<\/script>/);

                    const decodeMaybeBase64Fallback = (s: string) => {
                        try { return atob(s.trim()); } catch (e) { return s.trim(); }
                    };

                    if (dataMatch) {
                        resolve({
                            data: JSON.parse(decodeMaybeBase64Fallback(dataMatch[1])),
                            schema: schemaMatch ? JSON.parse(decodeMaybeBase64Fallback(schemaMatch[1])) : null
                        });
                        return;
                    }
                    throw new Error("Missing data in HTML file.");
                }

                const decodeMaybeBase64 = (base64Str: string) => {
                    try {
                        const binary = atob(base64Str.trim());
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                        return new TextDecoder().decode(bytes);
                    } catch (e) {
                        return base64Str.trim();
                    }
                };

                resolve({
                    data: JSON.parse(decodeMaybeBase64(dataScript.textContent || '{}')),
                    schema: schemaScript ? JSON.parse(decodeMaybeBase64(schemaScript.textContent || '{}')) : null
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsText(file);
    });
};
