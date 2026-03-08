import pytest
from generated_pom.pages.generated_page import GeneratedPage
from utils.json_util import JsonUtil
from config.config import Config
import os

class TestGenerated:
    @pytest.fixture
    def generated_data(self):
        # Dynamically constructing path relative to this test file
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(base_dir, "data", "generated_data.json")
        if os.path.exists(path):
            return JsonUtil.read_json(path)
        return {}

    def test_flow(self, page, generated_data):
        page.set_default_timeout(Config.TIMEOUT)
        try:
            page_obj = GeneratedPage(page)
            page_obj.run_generated_flow(generated_data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise e
