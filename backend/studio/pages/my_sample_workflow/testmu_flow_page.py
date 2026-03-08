from base.base_page import BasePage
from locators.my_sample_workflow.testmu_flow_locators import TestmuFlowLocators
from playwright.sync_api import expect

class TestmuFlowPage(BasePage):
    def run_generated_flow(self, data: dict):
        self.navigate_to("https://www.testmuai.com/")
        self.click(TestmuFlowLocators.LOGIN_LINK)
        self.click(TestmuFlowLocators.EMAIL_ADDRESS_TEXTBOX)
        self.type_text(TestmuFlowLocators.EMAIL_ADDRESS_TEXTBOX, data.get("EMAIL_ADDRESS_TEXTBOX_DATA", [""] * 1)[0])
        self.press_key(TestmuFlowLocators.EMAIL_ADDRESS_TEXTBOX, "Tab")
        self.type_text(TestmuFlowLocators.PASSWORD_TEXTBOX, data.get("PASSWORD_TEXTBOX_DATA", [""] * 1)[0])
