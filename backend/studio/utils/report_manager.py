import os
import json
import base64
from datetime import datetime

class ReportManager:
    _instance = None

    def __new__(cls, output_dir: str):
        if cls._instance is None:
            cls._instance = super(ReportManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, output_dir: str):
        # Only initialize ONCE - don't reset on subsequent calls!
        if self._initialized:
            return
            
        self.output_dir = output_dir
        self.screenshot_dir = os.path.join(output_dir, "screenshots")
        os.makedirs(self.screenshot_dir, exist_ok=True)
        self.tests = {} 
        self.current_test_name = None
        self.start_time = datetime.now()
        self._initialized = True

    def reset_for_new_session(self):
        """Reset the test data for a new session. Call this explicitly at session start."""
        self.tests = {}
        self.current_test_name = None
        self.start_time = datetime.now()

    def start_test(self, test_id: str, display_name: str = ""):
        """Start tracking a new test. test_id should be unique (e.g., nodeid)."""
        self.current_test_name = test_id
        # Use display_name for cleaner report, fall back to test_id
        name_for_display = display_name if display_name else test_id
        self.tests[test_id] = {
            "name": name_for_display,
            "description": test_id,  # Store full path as description
            "status": "PASS",
            "logs": [],
            "start_time": datetime.now(),
            "end_time": None
        }

    def log_step(self, test_name: str = None, status: str = "INFO", details: str = "", media_path: str = None):
        if test_name is None:
            test_name = self.current_test_name
            
        if not test_name or test_name not in self.tests:
            if test_name:
                 self.start_test(test_name)
            else:
                 return 

        test = self.tests[test_name]
        
        if status.upper() == "FAIL":
            test["status"] = "FAIL"
            
        # Convert media path to base64 if it exists
        base64_img = None
        if media_path:
            try:
                # media_path is relative "screenshots/foo.png"
                # Need absolute path to read
                abs_path = os.path.join(self.output_dir, media_path)
                if os.path.exists(abs_path):
                    with open(abs_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                        base64_img = f"data:image/png;base64,{encoded_string}"
            except Exception as e:
                print(f"Failed to encode image: {e}")

        log_entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "status": status.upper(),
            "details": details,
            "media": base64_img # Store the base64 string directly
        }
        test["logs"].append(log_entry)

    def capture_screenshot(self, page, name: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        path = os.path.join(self.screenshot_dir, filename)
        try:
            page.screenshot(path=path)
            return os.path.join("screenshots", filename) 
        except Exception as e:
            print(f"Failed to screenshot: {e}")
            return None

    def flush(self, worker_id=None):
        """Generates the Helper Report or saves partial results if worker"""
        if worker_id:
            # We are in a worker process -> Save partial results to JSON
            partial_file = os.path.join(self.output_dir, f"partial_results_{worker_id}.json")
            with open(partial_file, 'w') as f:
                json.dump(self.tests, f, default=str)
        else:
            # Single threaded mode -> Standard generation
            self.generate_report(self.tests)

    def merge_and_create_report(self):
        """Merges all partial JSON result files and generates the final HTML report"""
        # Start with local tests (crucial for serial execution)
        merged_tests = self.tests.copy()
        
        # Find all partial result files
        if not os.path.exists(self.output_dir):
            return

        for filename in os.listdir(self.output_dir):
            if filename.startswith("partial_results_") and filename.endswith(".json"):
                path = os.path.join(self.output_dir, filename)
                try:
                    with open(path, 'r') as f:
                        data = json.load(f)
                        merged_tests.update(data)
                    # Optional: Clean up partial file after merge
                    # os.remove(path) 
                except Exception as e:
                    print(f"Failed to merge {filename}: {e}")

        self.generate_report(merged_tests)

    def generate_report(self, test_data):
        """Internal method to generate HTML from provided test data"""
        report_path = os.path.join(self.output_dir, "extent_report.html")
        
        total = len(test_data)
        passed = sum(1 for t in test_data.values() if t["status"] == "PASS")
        failed = total - passed
        pass_pct = (passed / total * 100) if total > 0 else 0
        
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Automation Execution Report</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            <style>
                :root {{
                    --bg-dark: #121212;
                    --bg-card: #1e1e1e;
                    --bg-sidebar: #181818;
                    --header-height: 70px;
                    --accent: #6C5DD3;
                    --pass: #00d26a;
                    --fail: #f44336;
                    --text-primary: #e0e0e0;
                    --text-secondary: #a0a0a0;
                }}
                body {{ margin: 0; font-family: 'Inter', sans-serif; background: var(--bg-dark); color: var(--text-primary); height: 100vh; overflow: hidden; }}
                
                /* Layout */
                .app-container {{ display: flex; height: 100vh; }}
                .sidebar {{ width: 320px; background: var(--bg-sidebar); border-right: 1px solid #333; display: flex; flex-direction: column; }}
                .main-content {{ flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }}
                
                /* Sidebar Header */
                .brand {{ height: var(--header-height); display: flex; align-items: center; padding: 0 24px; border-bottom: 1px solid #333; }}
                .brand h2 {{ margin: 0; font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }}
                .brand h2 i {{ color: var(--accent); }}

                /* Stats Summary */
                .stats-panel {{ padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 1px solid #333; background: #232323; }}
                .stat-card {{ background: #2c2c2c; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #333; }}
                .stat-value {{ display: block; font-size: 24px; font-weight: 700; margin-bottom: 4px; }}
                .stat-label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }}
                .stat-pass {{ color: var(--pass); }}
                .stat-fail {{ color: var(--fail); }}

                /* Test List */
                .test-list {{ flex: 1; overflow-y: auto; padding: 10px; }}
                .test-item {{ 
                    padding: 16px; margin-bottom: 8px; background: #252525; border-radius: 8px; cursor: pointer; 
                    border-left: 4px solid transparent; transition: all 0.2s;
                }}
                .test-item:hover {{ background: #2a2a2a; transform: translateX(2px); }}
                .test-item.active {{ background: #2f2f2f; border-left-color: var(--accent); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }}
                
                .test-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }}
                .test-name {{ font-weight: 600; font-size: 14px; color: #fff; }}
                .duration {{ font-size: 11px; color: var(--text-secondary); }}
                
                .badge {{ padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }}
                .badge-pass {{ background: rgba(0, 210, 106, 0.15); color: var(--pass); }}
                .badge-fail {{ background: rgba(244, 67, 54, 0.15); color: var(--fail); }}

                /* Main Content */
                .top-bar {{ height: var(--header-height); background: var(--bg-card); border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; }}
                .top-bar h1 {{ margin: 0; font-size: 20px; font-weight: 600; }}
                
                .content-scroll {{ flex: 1; overflow-y: auto; padding: 30px; scroll-behavior: smooth; }}
                .test-detail-card {{ background: var(--bg-card); border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.2); max-width: 1000px; margin: 0 auto; }}
                
                .card-header {{ padding: 24px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }}
                .card-header h2 {{ margin: 0; font-size: 22px; }}
                
                /* Log Table */
                .log-table {{ width: 100%; border-collapse: collapse; }}
                .log-table th {{ text-align: left; padding: 16px 24px; background: #252525; font-size: 12px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid #333; }}
                .log-table td {{ padding: 16px 24px; border-bottom: 1px solid #2a2a2a; font-size: 14px; vertical-align: top; }}
                .log-table tr:hover {{ background: #242424; }}
                .log-time {{ font-family: monospace; color: var(--text-secondary); font-size: 12px; }}
                
                /* Screenshots */
                .thumbnail {{ 
                    width: 120px; height: 70px; object-fit: cover; border-radius: 6px; cursor: zoom-in; 
                    border: 1px solid #444; margin-top: 8px; transition: transform 0.2s; 
                }}
                .thumbnail:hover {{ transform: scale(1.05); border-color: var(--accent); }}

                /* Modal */
                .modal {{ display: none; position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.95); backdrop-filter: blur(5px); justify-content: center; align-items: center; opacity: 0; transition: opacity 0.3s; }}
                .modal.show {{ opacity: 1; display: flex; }}
                .modal-img {{ max-width: 90%; max-height: 90vh; border-radius: 8px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); transform: scale(0.95); transition: transform 0.3s; }}
                .modal.show .modal-img {{ transform: scale(1); }}
                .close-btn {{ position: absolute; top: 30px; right: 30px; color: #fff; font-size: 40px; cursor: pointer; transition: 0.2s; }}
                .close-btn:hover {{ transform: rotate(90deg); color: var(--fail); }}
                
                /* Empty State */
                .empty-state {{ text-align: center; color: var(--text-secondary); margin-top: 100px; }}
                .empty-state i {{ font-size: 64px; opacity: 0.2; margin-bottom: 20px; }}

            </style>
        </head>
        <body>
            <div class="app-container">
                <!-- Sidebar -->
                <div class="sidebar">
                    <div class="brand">
                        <h2><i class="material-icons">dashboard</i> Test Results</h2>
                    </div>
                    <div class="stats-panel">
                        <div class="stat-card">
                            <span class="stat-value stat-pass">{passed}</span>
                            <span class="stat-label">Passed</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value stat-fail">{failed}</span>
                            <span class="stat-label">Failed</span>
                        </div>
                    </div>
                    <div class="test-list" id="testList">
                        <!-- Items injected by JS -->
                    </div>
                </div>

                <!-- Main -->
                <div class="main-content">
                    <div class="top-bar">
                        <h1>Test Details</h1>
                        <span style="font-size: 12px; color: #666;">Generated on {datetime.now().strftime("%d/%m/%Y %I:%M:%S %p")}</span>
                    </div>
                    <div class="content-scroll">
                        <div id="detailsPlaceholder" class="empty-state">
                            <i class="material-icons">assignment</i>
                            <h3>Select a test to view details</h3>
                            <p>Test execution logs and screenshots will appear here.</p>
                        </div>
                        <div id="testDetails" style="display: none;">
                            <!-- Details injected by JS -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Lightbox -->
            <div id="imageModal" class="modal" onclick="closeModal()">
                <div class="close-btn" onclick="closeModal()">&times;</div>
                <img class="modal-img" id="img01" onclick="event.stopPropagation()">
            </div>

            <script>
                const tests = """ + json.dumps(test_data, default=str) + """;
                
                // Initialize Sidebar
                const listContainer = document.getElementById('testList');
                let firstTest = null;
                
                Object.keys(tests).forEach((key, index) => {
                    if (index === 0) firstTest = key;
                    const test = tests[key];
                    const statusClass = test.status === 'PASS' ? 'badge-pass' : 'badge-fail';
                    const activeClass = index === 0 ? '' : ''; // Don't auto-select stylistically initially
                    
                    const item = document.createElement('div');
                    item.className = `test-item ${activeClass}`;
                    item.onclick = () => loadTest(key, item);
                    item.innerHTML = `
                        <div class="test-header">
                            <span class="test-name">${test.name}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="badge ${statusClass}">${test.status}</span>
                            <span class="duration">${test.start_time.split(' ')[1]}</span>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });

                function loadTest(name, element) {
                    // Update active state in sidebar
                    document.querySelectorAll('.test-item').forEach(el => el.classList.remove('active'));
                    if(element) element.classList.add('active');
                    
                    const test = tests[name];
                    const details = document.getElementById('testDetails');
                    const placeholder = document.getElementById('detailsPlaceholder');
                    
                    placeholder.style.display = 'none';
                    details.style.display = 'block';
                    
                    const statusClass = test.status === 'PASS' ? 'badge-pass' : 'badge-fail';
                    
                    let logsHtml = '';
                    test.logs.forEach(log => {
                        let mediaHtml = '';
                        if (log.media) {
                            mediaHtml = `<br><img src="${log.media}" class="thumbnail" onclick="openModal('${log.media}')">`;
                        }
                        
                        const rowClass = log.status === 'FAIL' ? 'color: #ff6b6b;' : '';
                        const resultBadge = log.status === 'FAIL' 
                            ? `<span class="badge badge-fail">FAIL</span>` 
                            : (log.status === 'PASS' ? `<span class="badge badge-pass">PASS</span>` : `<span style="font-size:10px; opacity:0.5">INFO</span>`);
                            
                        logsHtml += `
                            <tr>
                                <td class="log-time">${log.timestamp}</td>
                                <td>${resultBadge}</td>
                                <td style="${rowClass}">${log.details} ${mediaHtml}</td>
                            </tr>
                        `;
                    });

                    details.innerHTML = `
                        <div class="test-detail-card">
                            <div class="card-header">
                                <h2>${test.name}</h2>
                                <span class="badge ${statusClass}" style="font-size: 14px; padding: 6px 12px;">${test.status}</span>
                            </div>
                            <table class="log-table">
                                <thead>
                                    <tr>
                                        <th width="100">Time</th>
                                        <th width="80">Status</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logsHtml}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                // Modal Logic
                function openModal(src) {
                    const modal = document.getElementById("imageModal");
                    const img = document.getElementById("img01");
                    img.src = src;
                    modal.classList.add('show');
                }

                function closeModal() {
                    const modal = document.getElementById("imageModal");
                    modal.classList.remove('show');
                }
                
                // Keyboard support
                document.addEventListener('keydown', function(event) {
                    if (event.key === "Escape") {
                        closeModal();
                    }
                });
            </script>
        </body>
        </html>
        """
        
        with open(report_path, 'w') as f:
            f.write(html)
        
        print(f"\nCustom Extent Report generated at: {report_path}")
