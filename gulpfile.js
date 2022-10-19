const {src, dest, watch, parallel, series} = require ('gulp');

const sass         = require('gulp-sass')(require('sass'));
const concat       = require('gulp-concat');
const browserSync  = require('browser-sync').create();
const uglify       = require('gulp-uglify-es').default;
const autoprefixer = require('gulp-autoprefixer');
const del          = require('del');
const cleanCSS     = require('gulp-clean-css');
const htmlmin      = require('gulp-htmlmin');






function syncBrowser (){
    browserSync.init({
        server:{
            baseDir:'src/'
        },
        notify:false
    });
}

function cleanDist(){
    return del('dist')
}

function html() {
    return src('src/**.html')
      .pipe(htmlmin({
        collapseWhitespace: true
      }))
      .pipe(dest('dist'))
      .pipe(browserSync.stream())

  }


function scripts(){
    return src([
        'src/js/main.js'
    ])
    .pipe(concat('main.min.js'))
    .pipe(uglify())
    .pipe(dest('src/js'))
    .pipe(browserSync.stream())
}

function uglifyDist() {
    return src([
        'dist/js/**/*.js',
    ])
    .pipe(uglify())
    .pipe(dest('dist/js'))
}


function styles (){
    return src('src/sass/**/*.+(sass|scss)')
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(concat('style.min.css'))
        .pipe(autoprefixer({
            overrideBrowserslist: ['last 10 versions'],
            grid: true
        }))
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(dest('src/css'))
        .pipe(browserSync.stream());
}

function build(){
    return src([
        'src/css/style.min.css',
        'src/fonts/**/*',
        'src/js/**/*.js',
        'src/img/**/*',
    ],{base: 'src'})
    .pipe(dest('dist'))
}

function watching(){
    watch(['src/sass/**/*.scss'], styles)
    watch(['src/js/**/*.js','!src/js/main.min.js'], scripts)
    watch('src/**.html').on('change', browserSync.reload);
}

exports.styles = styles;
exports.watching = watching;
exports.syncBrowser = syncBrowser;
exports.scripts = scripts;
exports.cleanDist = cleanDist;
exports.html = html;


exports.build = series(cleanDist,html, build, uglifyDist);


exports.default = parallel(styles,scripts,syncBrowser, watching);