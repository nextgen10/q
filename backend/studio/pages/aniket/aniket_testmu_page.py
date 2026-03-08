from base.base_page import BasePage
from locators.aniket.aniket_testmu_locators import AniketTestmuLocators
from playwright.sync_api import expect

class AniketTestmuPage(BasePage):
    def run_generated_flow(self, data: dict):
        self.navigate_to("https://www.testmuai.com/lp/?utm_source=google&utm_medium=cpc&utm_campaign=TestMu_AI_Search_Brand_New_All_Geo_LV&utm_term=testmu&utm_id=23456062060&utm_content=TestMuAI-Exact&gad_source=1&gad_campaignid=23456062060&gbraid=0AAAAAp7I9OJ6Jp4tJpCiFpjnjGf5nOhJk&gclid=CjwKCAiAtLvMBhB_EiwA1u6_PsZ5sBGKJmzHbUoYvOkmfmW8ssWcRMVI9L_OJ5j-XK9zaSYC6JpJURoC1yAQAvD_BwE")
        self.click(AniketTestmuLocators.POWER_YOUR_SOFTWARE_TESTING_HEADING)
