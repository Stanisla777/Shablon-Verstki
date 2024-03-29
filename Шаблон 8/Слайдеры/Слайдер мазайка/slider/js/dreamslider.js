(function ($) {
    'use strict';
    // debouncing logic
    var debounce = function (func, threshold, execAsap) {
        var timeout;
        return function debounced() {
            var obj = this;
            var args = arguments;
            function delayed() {
                if (!execAsap) {
                    func.apply(obj, args);
                }
                timeout = null;
            }
            if (timeout) {
                clearTimeout(timeout);
            } else if (execAsap) {
                func.apply(obj, args);
            }
            timeout = setTimeout(delayed, threshold || 100);
        };
    };

    //template for spinner,navigation controls & empty thumbs filler
    var staticTmpl = {
        loaderTmpl : '<div class="im_loading">'+
                          '<div class="loader-inner line-scale-pulse-out">'+
                            '<div></div>' +
                            '<div></div>' +
                            '<div></div>' +
                            '<div></div>' +
                            '<div></div>' +
                          '</div>'+
                      '</div>'+
                      '<div class="im_next"></div>' +
                      '<div class="im_prev"></div>',
        thumbsContTmpl : '<div class="thmb_filler"><img src="img/thumbsCont.png" alt="No Image"/></div>'
    } ;

    var thumbsFiller = function ($imWrapper, $perline){
        var $thumbsOnPage = $imWrapper.children('div');
        var thumbsCount = $thumbsOnPage.length;
        var thumbsPerSingleMode = $perline * 5;
        //populate filler thumbs container if they are less than COUNT X 5 [number of rows for single-mode image]
        if(thumbsCount < thumbsPerSingleMode || thumbsCount % $perline !== 0){
            var nextThumbsCntLimit = thumbsCount > thumbsPerSingleMode ?
                                        (Math.ceil(thumbsCount/$perline)) * $perline : thumbsPerSingleMode;
            for (var index = thumbsCount; index < nextThumbsCntLimit; index++){
                $imWrapper.append(staticTmpl.thumbsContTmpl);
            }
            return $imWrapper.children('div');
        }
        return $thumbsOnPage;
    };

    //Dream Slider functions starts here
    var dreamSlider = function ($container, options) {

        //flag to control the click event
        var flgClick = true;
        //the wrapper/ root div
        var $imWrapper = $container.find('.im_wrapper');
        //all the thumbs
        var $thumbs = thumbsFiller($imWrapper, options.thumbsPerLine);
        //all the thumbs excluding filler
        var $thumbsNotFiller = $thumbs.not('.thmb_filler');
        //limit no of thumbs to load with images on screen(max that can fit in view-port)
        var preLoadThumbsLimit;
        //static margin for thumbs
        var thumbMargin = 35;

        //$thumbs dimensions
        var $thumbsDimension = {
            width : $thumbs.width(),
            height: $thumbs.height()
        };
        //window dimensions
        var windowDimensions = {
            width : $(window).width(),
            height : $(window).height()
        };
        //all images excluding filler
        var $thumbImgsNotFiller = $thumbsNotFiller.find('img');
        //number of images
        var nmbThumbs = $thumbs.length;
        //image loading status
        var $imLoading = null;
        //the next and previous buttons
        var $imNext = null;
        var $imPrev = null;
        //number of thumbs per line
        var thumbsPerLine = options.thumbsPerLine;
        //animation effectfrom options
        var easingEffect = 'none';
        //number of thumbs per column
        var perCol = Math.ceil(nmbThumbs / thumbsPerLine);
        //Number of thumbs on View port as per standard size(1024 X 768)
        var nmbThumbsInViewPort = thumbsPerLine * 5;
        //Grid layout for single mode
        var $gridLayoutSingleMode = $imWrapper.children('div').slice(0, nmbThumbsInViewPort);
        //index of the current thumb
        var current = -1;
        //mode = grid | single
        var mode = 'grid';
        //thumbs in current view port
        var $curViewPortThumbs;
        //an array with the positions of the thumbs,
        //used for the navigation in single mode
        var positionsArray = [];
        var i;
        var loadedImageIndex = 0;
        //generic hover handler
        var hoverHandler = null;
        //generic blur handler
        var blurHandler = null;
        var easeOptionFallabck = false;
        var lastScrollTop = $(window).scrollTop(); 

        //load 'easeEffect' option to plugin
        if (!!options.easeEffect) {
            easingEffect = options.easeEffect;
        }
        //Custom jquery easing function
        jQuery.extend(jQuery.easing, {
            easeOutBounce: function (x, t, b, c, d) {
                if ((t /=  d) < (1 / 2.75)) {
                    return c * (7.5625 * t * t) + b;
                } else if (t < (2 / 2.75)) {
                    return c * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75) + b;
                } else if (t < (2.5 / 2.75)) {
                    return c * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375) + b;
                } else {
                    return c * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375) + b;
                }
            }
        });

        for (i = 0; i < nmbThumbs; ++i) {
            positionsArray[i] = i;
        }

        $container.append(staticTmpl.loaderTmpl);

        $imLoading = $container.find('.im_loading');
        $imNext = $container.find('.im_next');
        $imPrev = $container.find('.im_prev');

        //preload all the images
        $imLoading.show();

        //lazyload handler
        var lazyloadHandler =  function (currentScrollTop, allLazyLoadImgs , allLazyLoadImgsCount) {
            var viewportBottom = currentScrollTop + windowDimensions.height;

            for(var index=0; index < allLazyLoadImgsCount; index++){
                var lazyImage = allLazyLoadImgs[index];
                var imgOffsetTop = lazyImage.parentElement.offsetTop;
                 if(viewportBottom > imgOffsetTop) {
                    $(lazyImage).attr('src',$(lazyImage).data('src'));
                    $(lazyImage).removeClass('thmb_filler');
                } 
            }
        };

        //call lazyload handler on scroll event with debouncing logic
        $(window).lazyLoad(function(){
            var currentScrollTop = $(window).scrollTop();
            var allLazyLoadImgs = $('.thmb_filler');
            var allLazyLoadImgsCount = allLazyLoadImgs.length;

            //handle lazy loading of images when one or more filler thumbs present on screen
            //and scrolling downwards
            if(allLazyLoadImgs.length > 0 && currentScrollTop > lastScrollTop) {
                lastScrollTop = currentScrollTop;
                lazyloadHandler(currentScrollTop, allLazyLoadImgs, allLazyLoadImgsCount);
            } 
        });

        //hover handler for bounce animation
        function thumbsBounceHover($this) {
            $this.filter(':not(:animated)').animate({
                top: parseInt($this.css('top')) - 25
            }, 500, 'easeOutBounce',
                    function () {
                $this.animate({
                    top: parseInt($this.css('top')) + 25
                }, 500, 'easeOutBounce');
            });
        }

        function thumbsStandOutHover($this) {
            $this.siblings().not('.thmb_filler').stop().fadeTo(300, 0.5);
        }

        //Todo option3 hover handler
        function option3Hover() {
            return;
        }

        //blur handler for bounce animation
        function thumbsBounceBlur() {
            return;
        }

        //blur handler for standout animation
        function thumbsStandOutBlur($this) {
            $this.siblings().not('.thmb_filler').stop().fadeTo(500, 1);
        }

        //Todo option3 blur handler
        function option3Blur() {
            return;
        }

        function hoverEffect($targetThumbs) {
            $targetThumbs.hover(function () {
                hoverHandler($(this));
            }, function () {
                blurHandler($(this));
            });
        }

        //attach hover & blur handler,if easing effect option is passed to plugin
        if (easingEffect !== 'none') {
            if (easingEffect === 'bounce') {
                hoverHandler = thumbsBounceHover;
                blurHandler = thumbsBounceBlur;
            } else if (easingEffect === 'standOut') {
                hoverHandler = thumbsStandOutHover;
                blurHandler = thumbsStandOutBlur;
            } else if (easingEffect === 'option3') {
                hoverHandler = option3Hover;
                blurHandler = option3Blur;
            } else {
                //when invalid 'easeEffect' provided set default ease effect(Zoom) & fallback
                $thumbImgsNotFiller.addClass('default_ease_zoom');
                easeOptionFallabck = true;
                return;
            }
            //finally attach hover and blur handlers to all $thumbs except for fillers
            hoverEffect($thumbsNotFiller);
        } else {
            $thumbImgsNotFiller.addClass('default_ease_zoom');
        }

        //controls if we can click on the thumbs or not
        //if theres an animation in progress
        //prevent user form clicking
        function setflag() {
            flgClick = !flgClick;
        }

        //get the max limit of thumbs that can fit in current viewport
        var getPreloadThumbsLimit = function() {
            var totalThumbHeight = ($thumbsDimension.height + thumbMargin);
            return (Math.ceil(windowDimensions.height / totalThumbHeight) * thumbsPerLine);
        };

        //disperses the thumbs in a grid based on windows dimentions
        function disperse() {
            if (!flgClick) {
                return;
            }
            setflag();
            mode = 'grid';
            //center point for first thumb along the width of the window
            var spacesW = windowDimensions.width / (thumbsPerLine + 1);
            //vertical space captured for each thumb 
            // = noOfThumbsPerColumn * (heightOfThumb + margin_space b/w thumbs)
            var verticalHeight = ($thumbsDimension.height + thumbMargin) * perCol;
            var spacesH = verticalHeight / (perCol + 1) + 3 ;

            //reset scroll
            lastScrollTop = $(window).scrollTop();

            //let's disperse the thumbs equally on the page
            $thumbs.each(function (i) {
                var $thumb = $(this);
                //calculate left and top for each thumb,
                //considering how many specified in the api
                var left = spacesW * ((i % thumbsPerLine) + 1) - $thumbsDimension.width / 2;
                var top = spacesH * (Math.ceil((i + 1) / thumbsPerLine)) - $thumbsDimension.height / 2;

                /*
                thumbs are animated to its final positions;
                also image are fade in to thumbs, animated to its 115x115 dimension,
                and background image of the thumb is removed - this
                is not relevant for the first time when disperse is called,
                but when changing from single to grid mode
                */
                var param = {
                    left: left + 'px',
                    top: top + 'px'
                };

                $thumb.stop()
                    .animate(param, 700, function () {
                        if (i === nmbThumbsInViewPort - 1) {
                            setflag();
                        }
                    })
                    .find('img')
                    .fadeIn(500, function () {
                        $thumb.css({
                            'background-image': 'none'
                        });
                        if(!$thumb.hasClass('thmb_filler')){
                             $(this).animate({
                                width: '115px',
                                height: '115px',
                                marginTop: '5px',
                                marginLeft: '5px'
                            }, 500);
                        } else {
                            $(this).removeAttr('style');
                            $thumb.css('opacity','0.3');
                        }
                    });
            });

            //attach the hover effect back to the $thumbs
            if (easingEffect !== 'none' && !easeOptionFallabck) {

                //remove/reverse all animation effects from  all $thumbs except fillers,
                //before despersing them
                $thumbsNotFiller.fadeTo(100, 1);

                //attach the hover and blur handlers back to all $thumbs except fillers
                hoverEffect($thumbsNotFiller);
            }
            //add border radius back to all thumbs to make look curved as before
            $thumbs.addClass('curved');
        }

        //starts the animation
        function start() {
            $imLoading.hide();

            //disperse the thumbs in a grid
            disperse();
        }

        function loadImages ($thumbImages) {
            //load maximum images that are accomodatable on current viewport, 
            //rest would be handled as lazy load
            preLoadThumbsLimit = getPreloadThumbsLimit();

            $thumbImages.each(function (index) {
                var $img = $(this).find('img');

                if(index < preLoadThumbsLimit){
                    $img.attr('src', $img.data('src'));
                }
                else {
                    $img.addClass('thmb_filler');
                }

                $img.on('load', function () {
                    ++loadedImageIndex;
                    if (loadedImageIndex === preLoadThumbsLimit) {
                        start();
                    }
                });
            });
        }


        /* Add background position to each grid in current view port */
        function addBackgroundPosition(thumbs) {
            var xpos;
            var ypos;
            var index = 0;
            var xposPX = '';
            var yposPX = '';

            //remove background-position css from all thumbs
            $(thumbs).css('background-position', '');

            for (ypos = 0; ypos >= -625; ypos = ypos - 125) {
                for (xpos = 0; xpos >= -625; xpos = xpos - 125) {
                    xposPX = xpos + 'px';
                    yposPX = ypos + 'px';
                    $(thumbs).eq(index++).css('background-position', xposPX + ' ' + yposPX);
                }
            }
            return thumbs;
        }

        //removes the navigation buttons
        function removeNavigation() {
            $imNext.stop().animate({right: '-50px'}, 300);
            $imPrev.stop().animate({left: '-50px'}, 300);
        }

        //add the navigation buttons
        function addNavigation() {
            $imNext.stop().animate({right: '0px'}, 300);
            $imPrev.stop().animate({left: '0px'}, 300);
        }

        //scroll to single mode view
        function scrollToView(targetIndex) {
            var targetThumb = $imWrapper.children('div').slice(targetIndex, targetIndex + 1);
            var targetOffsetTop = targetThumb.offset().top;
            $('html, body').animate({
                scrollTop: targetOffsetTop
            }, 900);
        }


        /*
        when any of the thumb is clicked, all the thumbs
        on grid are merged together and clicked thumbs image
        is shown in single mode(maximum dimension 690 X 575).
        thumsb are animated to show the single image in center
        of the screen. The original image itself is the background
        image that each thumb will have (different background positions)
        On clicking over the single image will disperse the image as
        thumbs in grid layout as before.
        */

        $thumbs.on('click', function () {
            if ((!flgClick) ||
                $(this).hasClass('thmb_filler') && mode === 'grid' ) {
                return;
            }
            setflag();

            var $this = $(this);
            var gridStartIndex = 0;
            var gridEndIndex = 0;

            //calculate the dimentions of the for every thumb to show in single mode
            var fW = thumbsPerLine * 125;
            var fH = perCol * 125;
            var fL = windowDimensions.width / 2 - fW / 2;
            var fT = windowDimensions.height / 2 - fH / 2;

            current = $this.index();

            if (mode === 'grid') {
                mode = 'single';

                //remove border radius from thumbs in single mode
                $thumbs.removeClass('curved');

                //the source of the full image
                var imageSrc = $this.find('img').attr('src');

                //dynamically calculate current grid in viewport & get start & end index of thumbs
                if (current < 30) {
                    gridStartIndex = 0;
                } else {
                    gridStartIndex = Math.floor(Math.abs((current - 24) / 6)) * 6;
                }

                gridEndIndex = gridStartIndex + nmbThumbsInViewPort;
                $curViewPortThumbs = $imWrapper.children('div').slice(gridStartIndex, gridEndIndex);
                $gridLayoutSingleMode = addBackgroundPosition($curViewPortThumbs);

                //scroll to active single mode view
                scrollToView(gridStartIndex);

                //remove the hover animation effect from all thumbs
                $thumbs.off('mouseenter mouseleave');

                //remove/reverse all animation effects from $curViewPortThumbs
                //before showing them in single mode
                $curViewPortThumbs.fadeTo(100, 1);

                $gridLayoutSingleMode.each(function (i) {
                    var $thumb = $(this);
                    var $image = $thumb.find('img');

                    if (i === 0) {
                        // remove the suffix 'px' from the css property value
                        fT = parseInt($thumb.css('top'), 10);
                    }

                    //first we animate the thumb image
                    //to fill the thumbs dimentions
                    $image.stop().animate({
                        width: '60%',
                        height: '60%',
                        marginTop: '0px',
                        marginLeft: '0px'
                    }, 150, function () {
                        /*
                        set the background image for the thumb
                        and animate the thumb_imgs postions and rotation
                        */
                       var param = {
                            left: fL + (i % thumbsPerLine) * 125 + 'px',
                            top: fT + Math.floor(i / thumbsPerLine) * 125 + 'px'
                        };

                        $thumb.css({
                            'background-image': 'url(' + imageSrc + ')',
                            'background-size': '750px 625px'
                        }).stop()
                            .animate(param, 1200, function () {
                                //insert navigation for the single mode
                                if (i === nmbThumbsInViewPort - 1) {
                                    addNavigation();
                                    setflag();
                                }
                            });
                        //fade out the thumb's image
                        $image.fadeOut(700);
                    });
                });
            } else {
                setflag();
                //remove navigation
                removeNavigation();
                //if we are on single mode then disperse the thumbs
                disperse();
            }
        });

        //User clicks next button (single mode), switch to next image in cycle
        $imNext.bind('click', function () {
            if (!flgClick) {
                return;
            }
            setflag();

            ++current;
            var $nextThumb = $imWrapper.children('div:nth-child(' + (current + 1) + ')');
            if($nextThumb.hasClass('thmb_filler')){
                return;
            }
            if ($nextThumb.length > 0) {
                var imageSrc = $nextThumb.find('img').attr('src');
                var arr = Array.shuffle(positionsArray.slice(0));
                $thumbs.each(function (i) {
                    //we want to change each divs background image
                    //on a different point of time
                    var t = $(this);
                    setTimeout(function () {
                        t.css({
                            'background-image': 'url(' + imageSrc + ')'
                        });
                        if (i === nmbThumbs - 1) {
                            setflag();
                        }
                    }, arr.shift() * 20);
                });
            } else {
                setflag();
                --current;
                return;
            }
        });

        //User clicks prev button (single mode),switch to previous image in cycle
        $imPrev.bind('click', function () {
            if (!flgClick) {
                return;
            }
            setflag();
            --current;
            var $prevThumb = $imWrapper.children('div:nth-child(' + (current + 1) + ')');
            if($prevThumb.hasClass('thmb_filler')){
                return;
            }
            if ($prevThumb.length > 0) {
                var imageSrc = $prevThumb.find('img').attr('src');
                var arr = Array.shuffle(positionsArray.slice(0));
                $thumbs.each(function (i) {
                    var t = $(this);
                    setTimeout(function () {
                        t.css({
                            'background-image': 'url(' + imageSrc + ')'
                        });
                        if (i === nmbThumbs - 1) {
                            setflag();
                        }
                    }, arr.shift() * 20);
                });
            } else {
                setflag();
                ++current;
                return;
            }
        });

        //on windows resize call the disperse function.
        $(window).smartresize(function () {
            removeNavigation();
            windowDimensions.width = $(window).width();
            windowDimensions.height = $(window).height();
            disperse();
        });

        //function to shuffle an array of images when navigated
        //between images in single mode
        Array.shuffle = function (array){
            var j,x,k;
            for( k = array.length; k;
            j = parseInt(Math.random() * k),
            x = array[--k], array[k] = array[j], array[j] = x){
                //empty block
            }
            return array;
        };

        //load every image as thumb
        loadImages.call(this, $thumbs);
    };

   //LazyLoad Images with debouncing logic
   jQuery.fn.lazyLoad = function (fn) {
        return fn ? this.bind('scroll', debounce(fn)) : this.trigger('lazyLoad');
    };

   //Smart Resize function with debouncing logic
   jQuery.fn.smartresize = function (fn) {
        return fn ? this.bind('resize', debounce(fn)) : this.trigger('smartresize');
    };

   //Dream Slider,fun begins here
   jQuery.fn.dreamSlider = function (options) {
        return dreamSlider($(this), options);
    };

}(jQuery));
