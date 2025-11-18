(function() {
    var isVertical = window.matchMedia('(orientation: portrait)').matches;
    var orientation = isVertical ? 'vertical' : 'horizontal';
    var percentage = localStorage.getItem('split-' + orientation) || 50;
    function setSplit() {
        if (isVertical) {
            var top = document.querySelector('.top-panel');
            var bottom = document.querySelector('.bottom-panel');
            if (top && bottom) {
                top.style.flex = '0 0 ' + percentage + '%';
                bottom.style.flex = '0 0 ' + (100 - percentage) + '%';
            }
        } else {
            var left = document.querySelector('.left-panel');
            var right = document.querySelector('.right-panel');
            if (left && right) {
                left.style.flex = '0 0 ' + percentage + '%';
                right.style.flex = '0 0 ' + (100 - percentage) + '%';
            }
        }
    }
    document.addEventListener('DOMContentLoaded', setSplit);
})();