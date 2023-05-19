export function slider(slides, direction, prev, next) {
    let slideIndex = 1; //текущий слайд, который показывается пользователю
    let paused; //втом. показ слайдов
    const items = document.querySelectorAll(slides);
    //ф-я перемищения слайд индекса и самого слайдера
    function showSlides(n) {
        if (n > items.length) { //индекс будет больше чем фактическое кол-во слайдов
            slideIndex = 1;
        }
        if (n < 1) {
            slideIndex = items.length;
        }
        //скрываем все, показываем только нужный
        items.forEach(item => {
            item.classList.remove('_flex');
            item.classList.add('animate__animated', '_hide');
        });
        items[slideIndex - 1].classList.remove('_hide');
        items[slideIndex - 1].classList.add('_flex');
    }
    showSlides(slideIndex); // инициализация слайдов, скроем все, покажем по умолчанию (первый)
    //функционал самого слайдера
    function plusSlides(n) {
        showSlides(slideIndex += n);
    }
    try {
        const prevBtn = typeof prev === 'string' ? document.querySelector(prev) : undefined;
        const nextBtn = typeof next === 'string' ? document.querySelector(next) : undefined;
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                plusSlides(-1);
                items[slideIndex - 1].classList.remove('slideInLeft');
                items[slideIndex - 1].classList.add('slideInRight');
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                plusSlides(1);
                items[slideIndex - 1].classList.remove('slideInRight');
                items[slideIndex - 1].classList.add('slideInLeft');
            });
        }
    }
    catch (e) { }
    //активация анимации
    function activateAnimation() {
        if (direction === 'vertical') {
            paused = +(setInterval(function () {
                plusSlides(1);
                items[slideIndex - 1].classList.add('slideInDown');
            }, 6000));
        }
        else {
            paused = +(setInterval(function () {
                plusSlides(1);
                items[slideIndex - 1].classList.remove('slideInRight');
                items[slideIndex - 1].classList.add('slideInLeft');
            }, 6000));
        }
    }
    activateAnimation();
    const parentElemOfSlide = items[0].parentElement;
    if (parentElemOfSlide) {
        parentElemOfSlide.addEventListener('mouseenter', () => {
            clearInterval(paused);
        });
    }
    if (parentElemOfSlide) {
        parentElemOfSlide.addEventListener('mouseleave', () => {
            activateAnimation();
        });
    }
}
//# sourceMappingURL=slider.js.map