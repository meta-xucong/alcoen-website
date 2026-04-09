$(function () {
    if(navigator.appName == "Microsoft Internet Explorer" &&(navigator.appVersion .split(";")[1].replace(/[ ]/g,"")=="MSIE6.0"||navigator.appVersion .split(";")[1].replace(/[ ]/g,"")=="MSIE7.0"||navigator.appVersion .split(";")[1].replace(/[ ]/g,"")=="MSIE8.0"))
    {
        $('body').css({'background-color':'#3cbbdc'}).html('<div id="web-ietip"><a href="http://se.360.cn/" target="_blank" title="360浏览器" style="width: 60px;"></a><a href="http://chrome.360.cn/" target="_blank" title="360极速浏览器" style="width: 53px;"></a><a href="http://ie.sogou.com/" target="_blank" title="搜狗浏览器"></a><a href="http://browser.qq.com/" target="_blank" title="QQ浏览器" style="width: 55px;"></a><a href="http://www.liebao.cn/" target="_blank" title="猎豹浏览器" style="width: 55px;"></a><a href="http://www.google.cn/intl/zh-CN/chrome/browser/" target="_blank" title="谷歌浏览器"></a><a href="http://www.firefox.com.cn/" target="_blank" title="火狐浏览器" style="width: 55px;"></a><a href="https://www.apple.com/cn/safari/" target="_blank" title="仅支持Mac系统" style="width: 58px;"></a><a href="http://rj.baidu.com/search/index/?kw=IE11" target="_blank" style="width: 55px;"></a></div>')
    }
});
   