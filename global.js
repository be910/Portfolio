console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


// let navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );

// currentLink?.classList.add('current');

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'CV/', title: 'CV'},
  { url: 'contact/', title: 'Contact'},
  { url: 'https://github.com/be910', title: 'GitHub' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  // next step: create link and add it to nav
  nav.insertAdjacentHTML('beforeend', `<a href="${url}">${title}</a>`);

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }
  
  nav.append(a);

}

