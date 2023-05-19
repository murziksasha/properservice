export function mask(this: void, selector: string) {
  let setCursorPosition = (pos: number, elem: HTMLInputElement) => {
    elem.focus();

    if (elem.setSelectionRange) {
      elem.setSelectionRange(pos, pos);
    } else if ((elem as HTMLInputElement & { createTextRange: () => Range }).createTextRange) {
      let range = (elem as HTMLInputElement & { createTextRange: () => Range }).createTextRange();
      range.collapse(true);
      range.setStart(elem, pos);
      let sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  function createMask(this: HTMLInputElement, event: Event) {
    let matrix = '+38 (___) ___ __ __';
    let i = 0;
    let def = matrix.replace(/\D/g, '');
    let val = this.value.replace(/\D/g, '');

    if (def.length >= val.length) {
      val = def;
    }
    this.value = matrix.replace(/./g, function (a) {
      return /[_\d]/.test(a) && i < val.length ? val.charAt(i++) : i >= val.length ? '' : a;
    });
    if (event.type === 'blur') {
      if (this.value.length == 2) {
        this.value = '';
      }
    } else {
      setCursorPosition(this.value.length, this);
    }
  }

  let inputs = document.querySelectorAll<HTMLInputElement>(selector);
  inputs.forEach(input => {
    input.addEventListener('input', createMask);
    input.addEventListener('focus', createMask);
    input.addEventListener('blur', createMask);
  });

  // createMask.bind(this);
  // setCursorPosition.bind(this);
}
