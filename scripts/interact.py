from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':1440,'height':900})
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://localhost:4173/#/peta'); pg.wait_for_timeout(1200)
    # klik peta di Jawa
    box=pg.locator('.peta-canvas .map').bounding_box()
    pg.mouse.click(box['x']+box['width']*0.36, box['y']+box['height']*0.62); pg.wait_for_timeout(1200)
    print('hash after click:', pg.evaluate('location.hash'))
    print('card:', pg.locator('.rc-t h3').all_inner_texts())
    # layer
    pg.get_by_role('tab',name='Klaster LISA').click(); pg.wait_for_timeout(400); print('layer hash', pg.evaluate('location.hash'))
    # search
    pg.locator('.peta-tools input').fill('surab'); pg.wait_for_timeout(200); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200); print('after search', pg.locator('.rc-t h3').all_inner_texts())
    # asisten
    pg.locator('.fab').click(); pg.locator('.as-in input').fill('pengangguran tertinggi di jawa barat'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    print(pg.locator('.msg.bot p').last.inner_text()[:300])
    pg.locator('.as-in input').fill('bandingkan kota bandung dan kota surabaya'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    print(pg.locator('.msg.bot p').last.inner_text()[:400])
    pg.locator('.as-in input').fill('klaster di sumatera'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    print(pg.locator('.msg.bot p').last.inner_text()[:300])
    pg.locator('.as-in input').fill('ringkasan kota bandung'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    print(pg.locator('.msg.bot p').last.inner_text()[:300])
    pg.screenshot(path='shots/i_assist.png')
    # simulator preset
    pg.goto('http://localhost:4173/#/simulator'); pg.wait_for_timeout(800)
    t1=pg.locator('.big b').inner_text(); pg.get_by_text('Padat karya').first.click(); pg.wait_for_timeout(300); print('sim',t1,'->',pg.locator('.big b').inner_text())
    # reload persists state in URL
    pg.goto('http://localhost:4173/#/kompas?r=pelatihan&w=3273'); pg.wait_for_timeout(800); print(pg.locator('.queue li').count(),'pelatihan rows')
    pg.screenshot(path='shots/i_pelatihan.png',full_page=True)
    # keyboard focus: tab order exists
    print('errors',errs)
    b.close()
