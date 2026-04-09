$(document).ready(function() {
    //让IE9支持placeholder
    $('input, textarea').placeholder();
    //点击遮罩层
    $(".h-opa").click(function(){
    	$(".header").removeClass("menu-state")
    })
    //点击菜单
    $(".h-menu").click(function(){
    	$(".header").addClass("menu-state")
    })
    //点击底部
    $(".f-o").click(function(e){
    	e.stopPropagation()
    	if($(".f-o").hasClass("show")){
    		$(".f-p").slideUp(300)
    		$(".f-o").removeClass("show")
    	}else{
    		$(".f-p").slideDown(300)
    		$(".f-o").addClass("show")
    	}
    })
    $(".f-p").click(function(e){
    	e.stopPropagation()
    })
    $("body").click(function(){
    	$(".f-p").slideUp(300)
    	$(".f-o").removeClass("show")
    })
    //是否有二级菜单，有显示下拉箭头
    $(".h-sub").each(function(){
        $(this).parents(".h-g").addClass("has-nav")
    })
    $(".has-nav").click(function(e){
        if($(window).width()<=900){
            e.preventDefault();
            if($(this).hasClass("show")){
                $(this).removeClass("show")
                $(this).find(".h-sub").slideUp(300)
            }else{
                $(this).addClass("show")
                $(this).find(".h-sub").slideDown(300)
            }
        }
    })
    $(".has-nav").mouseenter(function(e){
        if($(window).width()>900){
            $(this).find(".h-sub").stop().slideDown(300)
        }
    })
    $(".has-nav").mouseleave(function(){
        if($(window).width()>900){
            $(this).find(".h-sub").stop().slideUp(300)
        }
    })
    $(".h-f a").click(function(e){
        e.stopPropagation()
    })
    //动画特效
    var hh = $(window).height();
    $(window).scroll(function(e){
        var a = $(this).scrollTop();
        //滚动到b-a<hh/1.1 && a-b<hh这个范围展示效果
        $(".teaser,.lefter,.righter,.downer,.lter,.rter").each(function(){
            var b = $(this).offset().top;
            if(b-a<hh/1.1 && a-b<hh){
                $(this).addClass("is-visible");
            }
        })
    })
    $(window).trigger("scroll");
});