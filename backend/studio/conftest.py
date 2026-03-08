from playwright.sync_api import sync_playwright
import pytest
from config.config import Config
from utils.report_manager import ReportManager
from utils.json_util import JsonUtil
import os

@pytest.fixture(scope="session")
def report_manager():
    rm = ReportManager(Config.REPORTS_DIR)
    # Reset for new session to clear any stale data from previous runs (in-memory)
    rm.reset_for_new_session()
    yield rm
    # Get worker ID if running in parallel
    worker_id = os.environ.get("PYTEST_XDIST_WORKER")
    rm.flush(worker_id)

def pytest_sessionfinish(session, exitstatus):
    """
    Called after whole test run finishes.
    On the controller node (not a worker), merge all partial reports.
    """
    is_worker = os.environ.get("PYTEST_XDIST_WORKER") is not None
    if not is_worker:
        # We are the controller (or single process)
        # Check if we have partial results to merge
        rm = ReportManager(Config.REPORTS_DIR)
        # If there are partial results, merge them. 
        # If not (single process ran and created report directly), this allows re-generation or harmless no-op if logic checked.
        # Actually our updated flush() creates HTML directly if not worker.
        # But if we used xdist, the controller didn't run flush() because it didn't run tests (usually).
        # So we explicitly trigger merge here.
        rm.merge_and_create_report()

def pytest_configure(config):
    """
    Runs before tests start. Clean up old partial results on controller.
    """
    if not hasattr(config, "workerinput"): # Controller
        report_dir = Config.REPORTS_DIR
        if os.path.exists(report_dir):
            for f in os.listdir(report_dir):
                if f.startswith("partial_results_") and f.endswith(".json"):
                    try:
                        os.remove(os.path.join(report_dir, f))
                    except:
                        pass

@pytest.fixture(scope="session")
def test_data():
    data_path = os.path.join(Config.DATA_DIR, "login_data.json")
    if os.path.exists(data_path):
        return JsonUtil.read_json(data_path)
    return {}

@pytest.fixture(scope="function")
def test_wrapper(report_manager, request):
    """
    Wraps every test to initialize extent entry.
    """
    # nodeid looks like: tests/login/test_login.py::TestLogin::test_valid_login[chromium]
    test_id = request.node.nodeid
    
    # Create display name: strictly just the filename as requested
    parts = test_id.split("::")
    file_part = parts[0]
    display_name = os.path.basename(file_part).replace(".py", "")
        
    report_manager.start_test(test_id, display_name)
    yield
    # Outcome handled in page fixture or makereport, 
    # but strictly verify flush happens at session end.


@pytest.fixture(scope="session")
def playwright_instance():
    playwright = sync_playwright().start()
    yield playwright
    playwright.stop()

@pytest.fixture(scope="session")
def browser_instance(playwright_instance):
    browser_type = getattr(Config, 'BROWSER_TYPE', 'chromium').lower()
    headless_mode = getattr(Config, 'HEADLESS', False)
    slow_mo = getattr(Config, 'SLOW_MO', 500)

    if browser_type == 'firefox':
        browser = playwright_instance.firefox.launch(headless=headless_mode, slow_mo=slow_mo)
    elif browser_type == 'webkit':
        browser = playwright_instance.webkit.launch(headless=headless_mode, slow_mo=slow_mo)
    else:
        browser = playwright_instance.chromium.launch(headless=headless_mode, slow_mo=slow_mo)
    
    yield browser
    browser.close()

@pytest.fixture(scope="function")
def page(browser_instance, report_manager, test_wrapper, request):
    """Page fixture that reuses session-scoped browser but creates fresh context per test."""
    context = browser_instance.new_context(
        viewport={
            'width': getattr(Config, 'VIEWPORT_WIDTH', 1280), 
            'height': getattr(Config, 'VIEWPORT_HEIGHT', 720)
        }
    )
    page = context.new_page()
    # Set default timeout for all Playwright actions
    page.set_default_timeout(Config.TIMEOUT)
    
    yield page
    
    # Teardown & Logging
    try:
        # Use the same nodeid format as start_test for consistency
        test_id = request.node.nodeid

        # Create a clean filename for the screenshot
        safe_name = test_id.replace("/", "_").replace("::", "_").replace("[", "_").replace("]", "").replace(".py", "")

        # Check if rep_call exists and get its status
        rep_call = getattr(request.node, 'rep_call', None)
        if rep_call and rep_call.failed:
            screenshot_path = report_manager.capture_screenshot(page, safe_name + "_fail")
            report_manager.log_step(test_id, "FAIL", "Test Failed", screenshot_path)
        else:
            screenshot_path = report_manager.capture_screenshot(page, safe_name + "_pass")
            report_manager.log_step(test_id, "PASS", "Tear Down Evidence - Test Passed Successfully", screenshot_path)
    except Exception as e:
        print(f"Warning: Error in test teardown: {e}")
    finally:
        context.close()

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, "rep_" + rep.when, rep)
