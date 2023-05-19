
import { slider } from "./modules/slider/slider.js";
import { mask } from "./modules/mask/mask.js";


document.addEventListener('DOMContentLoaded',()=>{
  "use strict"
  
  slider('.feedback__slider-item', 'string', '.feedback.left-arrow', '.feedback.right-arrow');

  mask('[name="phone"]');

});