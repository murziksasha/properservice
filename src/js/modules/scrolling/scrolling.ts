export function scrolling(upSelector: string) {

  
  const upElem = document.querySelector(upSelector) as HTMLAnchorElement;

  upElem.classList.add('animate__animated', '_hide');
  window.addEventListener('scroll', () => {
    if(document.documentElement.scrollTop > 1650){
      upElem.classList.remove('animate__fadeOut', '_hide')
      upElem.classList.add('animate__fadeIn', '_show');
    } else{
      upElem.classList.remove('animate__fadeIn', '_show');
      upElem.classList.add('animate__fadeOut', '_hide')
    }
  });


  let links: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('[href^="#"]'); // получем все локальные ссылки 
  let speed = 0.2;

  links.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const target = e.currentTarget as HTMLAnchorElement;

      let widthTop = document.documentElement.scrollTop;
      let hash = target.hash;
      let toBlock = document.querySelector(hash)?.getBoundingClientRect().top;
      let start: number | null = null;

      requestAnimationFrame(step);

      function step(time: number){
        if(start === null){
          start = time;
        }
        
        let progress = time - start;
        if(toBlock){ // вся операция внутри нужна на сколько пикселей продвинуть и в какую сторону
          let r =  (toBlock < 0 ? Math.max(widthTop - progress/speed, widthTop + toBlock) : Math.min(widthTop + progress/speed, widthTop + toBlock)) // переменная отвечает за кол-во пикселей отлистываем для анимации
          
          document.documentElement.scrollTo(0, r);

          //реализации остановки анимации
          if(r !== widthTop + toBlock){
            requestAnimationFrame(step);
          } else {
            location.hash = hash;
          }
        }
      }

    });
  });


}