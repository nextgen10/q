import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://www.testmuai.com/")
    page.get_by_role("link", name="Login").click()
    page.get_by_role("textbox", name="Email Address").click()
    page.get_by_role("textbox", name="Email Address").fill("abc.com")
    page.get_by_role("textbox", name="Email Address").press("Tab")
    page.get_by_role("textbox", name="Password").fill("abc123")

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
