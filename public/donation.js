(() => {
  const donationUrl = 'https://saweria.co/masrajha';
  const tr = key => window.CocI18n?.t(key) || key;

  function openDonation(event) {
    event?.preventDefault();
    const dialog = document.getElementById('donationDialog');
    if (dialog?.showModal) dialog.showModal();
    else window.open(donationUrl, '_blank', 'noopener,noreferrer');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('a');
    button.className = 'donation-fab';
    button.href = donationUrl;
    button.innerHTML = '<span class="donation-fab-icon" aria-hidden="true">♥</span><span class="donation-fab-label"></span>';
    button.addEventListener('click', openDonation);
    document.body.appendChild(button);

    const dialog = document.createElement('dialog');
    dialog.id = 'donationDialog';
    dialog.className = 'donation-dialog';
    dialog.setAttribute('aria-labelledby', 'donationDialogTitle');
    dialog.innerHTML = '<div class="donation-dialog-inner"><button class="donation-dialog-close" type="button">×</button><h2 id="donationDialogTitle"></h2><p class="donation-dialog-description"></p><p class="donation-dialog-note"></p><a class="donation-dialog-link" href="https://saweria.co/masrajha" target="_blank" rel="noopener noreferrer"></a></div>';
    const updateTexts = () => {
      button.setAttribute('aria-label', tr('donation.buttonLabel'));
      button.querySelector('.donation-fab-label').textContent = tr('donation.title');
      dialog.querySelector('.donation-dialog-close').setAttribute('aria-label', tr('donation.close'));
      dialog.querySelector('#donationDialogTitle').textContent = tr('donation.title');
      dialog.querySelector('.donation-dialog-description').textContent = tr('donation.description');
      dialog.querySelector('.donation-dialog-note').textContent = tr('donation.note');
      dialog.querySelector('.donation-dialog-link').textContent = tr('donation.link');
    };
    updateTexts();
    window.addEventListener('coc-language-changed', updateTexts);
    dialog.querySelector('.donation-dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);

    document.querySelectorAll('[data-donation-trigger]').forEach(trigger => trigger.addEventListener('click', openDonation));
  });
})();
