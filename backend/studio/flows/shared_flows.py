from base.base_page import BasePage
from playwright.sync_api import expect
from locators.shared_locators import SharedLocators

class SharedFlows(BasePage):
    """
    Experimental Flow Layer for reusable business processes.
    These methods orchestrate multiple Page Objects or basic interactions.
    """
    def __init__(self, page):
        self.page = page
        # We can also initialize page objects here if needed
        # self.login_page = LoginPage(page)

    def testing_flow(self, data: dict):
        self.navigate_to("https://www.testmuai.com/")
        self.click(SharedLocators.LOGIN_LINK)
        self.click(SharedLocators.EMAIL_ADDRESS_TEXTBOX)
        self.type_text(SharedLocators.EMAIL_ADDRESS_TEXTBOX, data.get("EMAIL_ADDRESS_TEXTBOX_DATA", [""] * 1)[0])
        self.click(SharedLocators.PASSWORD_TEXTBOX)
        self.type_text(SharedLocators.PASSWORD_TEXTBOX, data.get("PASSWORD_TEXTBOX_DATA", [""] * 1)[0])
        self.click(SharedLocators.LOGIN_BUTTON)
        self.click(SharedLocators.TESTMU_AI_LINK)
        popup_page = self.page.context.pages[-1]  # Get the new popup
        self._popup_click(popup_page, SharedLocators.LOGIN_LINK, '', 'LOGIN_LINK')
        self._popup_click(popup_page, SharedLocators.EMAIL_ADDRESS_TEXTBOX, '', 'EMAIL_ADDRESS_TEXTBOX')
        self._popup_fill(popup_page, SharedLocators.EMAIL_ADDRESS_TEXTBOX, '', data.get("EMAIL_ADDRESS_TEXTBOX_DATA", [""] * 2)[1], 'EMAIL_ADDRESS_TEXTBOX')
        self._popup_click(popup_page, SharedLocators.PASSWORD_TEXTBOX, '', 'PASSWORD_TEXTBOX')
        self._popup_fill(popup_page, SharedLocators.PASSWORD_TEXTBOX, '', data.get("PASSWORD_TEXTBOX_DATA", [""] * 2)[1], 'PASSWORD_TEXTBOX')
        self._popup_click(popup_page, SharedLocators.LOGIN_BUTTON, '', 'LOGIN_BUTTON')
        self._popup_click(popup_page, SharedLocators.TESTMU_AI_LINK, '', 'TESTMU_AI_LINK')
        popup_page = self.page.context.pages[-1]  # Get the new popup
        self._popup_verify_text(popup_page, SharedLocators.H1, '', "Power Your Software Testing with AI Agents and Cloud", 'H1')
    def new_flow(self, data: dict):
        self.navigate_to("https://www.testmuai.com/")
        self.click(SharedLocators.LOGIN_LINK)
        self.click(SharedLocators.EMAIL_ADDRESS_TEXTBOX)
        self.type_text(SharedLocators.EMAIL_ADDRESS_TEXTBOX, data.get("EMAIL_ADDRESS_TEXTBOX_DATA", [""] * 1)[0])
        self.click(SharedLocators.PASSWORD_TEXTBOX)
        self.type_text(SharedLocators.PASSWORD_TEXTBOX, data.get("PASSWORD_TEXTBOX_DATA", [""] * 1)[0])
        self.click(SharedLocators.LOGIN_BUTTON)
        self.click(SharedLocators.TESTMU_AI_LINK)
        popup_page = self.page.context.pages[-1]  # Get the new popup
        self._popup_click(popup_page, SharedLocators.LOGIN_LINK, '', 'LOGIN_LINK')
        self._popup_click(popup_page, SharedLocators.EMAIL_ADDRESS_TEXTBOX, '', 'EMAIL_ADDRESS_TEXTBOX')
        self._popup_fill(popup_page, SharedLocators.EMAIL_ADDRESS_TEXTBOX, '', data.get("EMAIL_ADDRESS_TEXTBOX_DATA", [""] * 2)[1], 'EMAIL_ADDRESS_TEXTBOX')
        self._popup_click(popup_page, SharedLocators.PASSWORD_TEXTBOX, '', 'PASSWORD_TEXTBOX')
        self._popup_fill(popup_page, SharedLocators.PASSWORD_TEXTBOX, '', data.get("PASSWORD_TEXTBOX_DATA", [""] * 2)[1], 'PASSWORD_TEXTBOX')
        self._popup_click(popup_page, SharedLocators.LOGIN_BUTTON, '', 'LOGIN_BUTTON')
        self._popup_click(popup_page, SharedLocators.TESTMU_AI_LINK, '', 'TESTMU_AI_LINK')
        popup_page = self.page.context.pages[-1]  # Get the new popup
        self._popup_verify_text(popup_page, SharedLocators.H1, '', "Power Your Software Testing with AI Agents and Cloud", 'H1')
    def sample(self, data: dict):
        """
        Extracted snippet: sample
        """
        page.get_by_role('link', name='Login').click()
        page.get_by_role('textbox', name='Email Address').click()
        page.get_by_role('textbox', name='Email Address').fill('123@gmail.com')
        page.get_by_role('textbox', name='Password').click()
        page.get_by_role('textbox', name='Password').fill('ajfsjgggf')
        page.get_by_role('button', name='Login').click()
        with page.expect_popup() as page1_info:
    page.get_by_role('link', name='TestMu AI').click()

    def reusable_test_workflow_flow(self, data: dict):
        self.navigate_to("https://www.testmuai.com/")
        self.click(SharedLocators.LOGIN_LINK)
        self.click(SharedLocators.EMAIL_ADDRESS_TEXTBOX)
        self.type_text(SharedLocators.EMAIL_ADDRESS_TEXTBOX, data.get("EMAIL_ADDRESS_TEXTBOX_DATA", [""] * 1)[0])
        self.press_key(SharedLocators.EMAIL_ADDRESS_TEXTBOX, "Tab")
        self.type_text(SharedLocators.PASSWORD_TEXTBOX, data.get("PASSWORD_TEXTBOX_DATA", [""] * 1)[0])