import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://www.testmuai.com/lp/?utm_source=google&utm_medium=cpc&utm_campaign=TestMu_AI_Search_Brand_New_All_Geo_LV&utm_term=testmu&utm_id=23456062060&utm_content=TestMuAI-Exact&gad_source=1&gad_campaignid=23456062060&gbraid=0AAAAAp7I9OJ6Jp4tJpCiFpjnjGf5nOhJk&gclid=CjwKCAiAtLvMBhB_EiwA1u6_PsZ5sBGKJmzHbUoYvOkmfmW8ssWcRMVI9L_OJ5j-XK9zaSYC6JpJURoC1yAQAvD_BwE")
    page.get_by_role("heading", name="Power Your Software Testing").click()
    page.close()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
