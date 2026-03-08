from base.base_page import BasePage
from generated_pom.locators.generated_locators import GeneratedLocators
from playwright.sync_api import expect

class GeneratedPage(BasePage):
    def run_generated_flow(self, data: dict):
        self.navigate_to("https://www.testmuai.com/")
        self.click(GeneratedLocators.LOGIN_LINK)
        self.click(GeneratedLocators.EMAIL_ADDRESS_TEXTBOX)
        self.type_text(GeneratedLocators.EMAIL_ADDRESS_TEXTBOX, data.get("EMAIL_ADDRESS_TEXTBOX_DATA", [""] * 1)[0])
        self.press_key(GeneratedLocators.EMAIL_ADDRESS_TEXTBOX, "Tab")
        self.type_text(GeneratedLocators.PASSWORD_TEXTBOX, data.get("PASSWORD_TEXTBOX_DATA", [""] * 1)[0])
