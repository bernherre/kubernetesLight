(function(){
  // Simple TOC toggle and smooth scrolling
  const toc = document.getElementById('toc');
  const toggle = document.getElementById('toggle-toc');

  function supportsSmoothScroll(){
    return 'scrollBehavior' in document.documentElement.style;
  }

  toggle.addEventListener('click',()=>{
    if(toc.classList.contains('open')) toc.classList.remove('open');
    else toc.classList.add('open');
  });

  // Close TOC on clicking a link (mobile)
  toc.addEventListener('click',(e)=>{
    if(e.target.tagName === 'A' && window.innerWidth < 900){
      toc.classList.remove('open');
    }
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',function(e){
      const hash = this.getAttribute('href');
      const target = document.querySelector(hash);
      if(target){
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.pageYOffset - 16;
        if(supportsSmoothScroll()){
          window.scrollTo({top, behavior:'smooth'});
        } else {
          window.scrollTo(0, top);
        }
        history.replaceState(null,'',hash);
      }
    });
  });

  // Collapse long chapters into toggles if necessary (enhancement)
  document.querySelectorAll('.chapter').forEach(section=>{
    const header = section.querySelector('h2');
    if(!header) return;
    header.style.cursor='pointer';
    header.addEventListener('click',()=>{
      section.classList.toggle('collapsed');
      if(section.classList.contains('collapsed')){
        section.querySelectorAll('h3, p, ul, ol, audio, .dialog, dl').forEach(el=>el.style.display='none');
      } else {
        section.querySelectorAll('h3, p, ul, ol, audio, .dialog, dl').forEach(el=>el.style.display='block');
      }
    });
  });

  // Accessibility: close TOC on Escape
  document.addEventListener('keydown',(e)=>{
    if(e.key === 'Escape' && toc.classList.contains('open')){
      toc.classList.remove('open');
      toggle.focus();
    }
  });
})();