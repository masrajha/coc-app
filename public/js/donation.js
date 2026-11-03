(() => {
  const donationUrls = { saweria: 'https://saweria.co/masrajha', paypal: 'https://paypal.me/didikunila' };
  const tr = key => window.CocI18n?.t(key) || key;

  function openDonation(event) {
    event?.preventDefault();
    const dialog = document.getElementById('donationDialog');
    if (!dialog || dialog.open) return;
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('a');
    button.className = 'donation-fab';
    button.href = '#donationDialog';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'donationDialog');
    button.innerHTML = '<span class="donation-fab-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" focusable="false"><path d="M5 10h11v5a5.5 5.5 0 0 1-11 0v-5Z" fill="currentColor"/><path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2M3 21h16M8 7c-2-2 2-2 0-4m5 4c-2-2 2-2 0-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="donation-fab-label"></span>';
    button.addEventListener('click', openDonation);
    document.body.appendChild(button);

    const dialog = document.createElement('dialog');
    dialog.id = 'donationDialog';
    dialog.className = 'donation-dialog';
    dialog.setAttribute('aria-labelledby', 'donationDialogTitle');
    dialog.innerHTML = '<div class="donation-dialog-inner"><button class="donation-dialog-close" type="button">×</button><h2 id="donationDialogTitle"></h2><p class="donation-dialog-description"></p><p class="donation-dialog-note"></p><p id="donationMethodLabel" class="donation-method-label"></p><div class="donation-methods" role="group" aria-labelledby="donationMethodLabel"><a class="donation-dialog-link" data-donation-method="saweria" target="_blank" rel="noopener noreferrer"></a><a class="donation-dialog-link" data-donation-method="paypal" target="_blank" rel="noopener noreferrer"></a></div></div>';
    for (const [method, url] of Object.entries(donationUrls)) {
      const link = dialog.querySelector(`[data-donation-method="${method}"]`);
      link.href = url;
      const icon = document.createElement('span');
      icon.className = 'donation-method-icon';
      icon.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.src = `/assets/images/donation/${method}.png`;
      image.alt = ''; image.width = 26; image.height = 26; image.decoding = 'async';
      icon.appendChild(image);
      const label = document.createElement('span');
      label.className = 'donation-method-text';
      link.append(icon, label);
    }
    const updateTexts = () => {
      button.setAttribute('aria-label', tr('donation.buttonLabel'));
      button.querySelector('.donation-fab-label').textContent = tr('donation.supportShort');
      dialog.querySelector('.donation-dialog-close').setAttribute('aria-label', tr('donation.close'));
      dialog.querySelector('#donationDialogTitle').textContent = tr('donation.title');
      dialog.querySelector('.donation-dialog-description').textContent = tr('donation.description');
      dialog.querySelector('.donation-dialog-note').textContent = tr('donation.note');
      dialog.querySelector('#donationMethodLabel').textContent = tr('donation.chooseMethod');
      dialog.querySelector('[data-donation-method="saweria"] .donation-method-text').textContent = tr('donation.link');
      dialog.querySelector('[data-donation-method="paypal"] .donation-method-text').textContent = tr('donation.paypalLink');
    };
    updateTexts();
    window.addEventListener('coc-language-changed', updateTexts);
    const close = () => { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
    dialog.querySelector('.donation-dialog-close').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    document.body.appendChild(dialog);

    document.querySelectorAll('[data-donation-trigger]').forEach(trigger => trigger.addEventListener('click', openDonation));
  });
})();
