
import { slider } from "./modules/slider/slider.js";
import { mask } from "./modules/mask/mask.js";
import { scrolling } from "./modules/scrolling/scrolling.js";
import { moreFeedbacks } from "./modules/more-feedbacks/moreFeedback.js";
import { forms } from "./modules/form/form.js";


document.addEventListener('DOMContentLoaded',()=>{
  "use strict"
  const btn = document?.querySelector('#feed-google') as HTMLButtonElement;
  slider('.feedback__slider-item', 'string', '.feedback.left-arrow', '.feedback.right-arrow');

  mask('[name="phone"]');
  scrolling('.pageup');
  moreFeedbacks(btn);
  forms();

});