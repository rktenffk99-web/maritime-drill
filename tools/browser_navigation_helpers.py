"""Navigate the real v5.14 controls before exercising existing learning flows."""
def wait_plan(page, tab='today', configure=False):
    page.locator('#md-plan-navigation').wait_for(state='visible')
    page.locator(f'[data-md-plan-tab="{tab}"]').click()
    if configure and not page.locator('#md-plan-settings').evaluate('(el)=>el.open'):
        page.locator('#md-plan-settings > summary').click()
