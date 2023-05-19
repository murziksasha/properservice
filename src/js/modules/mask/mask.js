export function mask(selector) {
    let setCursorPosition = (pos, elem) => {
        elem.focus();
        if (elem.setSelectionRange) { //если есть такой метод на нашем тукущ. элементе
            elem.setSelectionRange(pos, pos); //начало и конец в одной точке выделения - просто поместит курсор
        }
        else if (elem.createTextRange) {
            let range = elem.createTextRange();
            range.collapse(true); //объеденяет граничные точки диапазона, первая с последней позиций
            range.setStart(elem, pos); // начальная точка выделения
            range.setEnd(elem, pos); // конечная точка выделения
            let sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    };
    function createMask(event) {
        let matrix = '+38 (___) ___ __ __';
        let i = 0;
        let def = matrix.replace(/\D/g, '');
        let val = this.value.replace(/\D/g, '');
        if (def.length >= val.length) { //если пользователь захочет удалить +3 то длина будет меньше и подставится значение по умолчанию
            val = def;
        }
        this.value = matrix.replace(/./g, function (a) {
            // - проверяем входит ли данный символ в определенный диапазо регуляр /[]/.test(a) - a - каждый символ внутри матрицы
            // - оператор i < val.length меньше кол-ва символов ъ
            // - если условие выполнится то будет i++ - то есть следующий символ
            // - вторая часть условия  i >= val.length ? '' (вернем пустую строку)
            // - если это условие не выоплнится - то вренем a - это тот же символ который пришел к нам в самом начеле колбек функции
            return /[_\d]/.test(a) && i < val.length ? val.charAt(i++) : i >= val.length ? '' : a;
        });
        //решение вопроса с фокусом и очистки поля когда курсор наводится и уводится
        if (event.type === 'blur') { //пользователь перестал что то вводить
            if (this.value.length == 2) {
                this.value = '';
            }
        }
        else { // иначе событие будет фокус
            setCursorPosition(this.value.length, this); //пишем отдельную функцию по установке курсора в определенную позицию
            //первый аргумент - кол-во элементов которые есть сейчас в инпуте
            //второй аргумент это элемент this который прям сейчас в работе
        }
    }
    let inputs = document.querySelectorAll(selector);
    inputs.forEach(input => {
        input.addEventListener('input', createMask);
        input.addEventListener('focus', createMask);
        input.addEventListener('blur', createMask);
    });
    // createMask.bind(this);
    // setCursorPosition.bind(this);
}
;
//# sourceMappingURL=mask.js.map