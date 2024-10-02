function createInterview() {
    var select = document.getElementById("template-selector");
    window.location.href = `/interview?templateId=${select.value}`;
}

function addBrandIdToURL(link, brandId) {
    if (link.href.indexOf('brandId')) {
        link.href = link.href.split('?')[0];
    }
    link.href += `?brandId=${brandId}`;
}

function setCurrentBrandId(brandId) {
    addBrandIdToURL(document.getElementById('new-binder'), brandId);
    addBrandIdToURL(document.getElementById('new-binder-with-placeholders'), brandId);
    const uploadComponent = document.getElementsByTagName('rl-file-upload')[0];
    if (uploadComponent) {
        const newUrl = uploadComponent.getAttribute("url").split("?")[0];
        uploadComponent.setAttribute("url", `${newUrl}?brandId=${brandId}`)
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const brandId = new URLSearchParams(window.location.search).get('brandId');
    const selector = document.getElementById('brand-selector');
    if (selector) {
        if(brandId) {
            setCurrentBrandId(brandId);
            selector.value = brandId;
        }
        selector.addEventListener('change', event => {
            setCurrentBrandId(event.target.value);
        });
    }
});
