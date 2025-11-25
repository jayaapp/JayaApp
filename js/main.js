function saveSplit(percentage) {
    const isVerticalLayout = window.matchMedia('(orientation: portrait)').matches;
    const orientation = isVerticalLayout ? 'vertical' : 'horizontal';
    localStorage.setItem('split-' + orientation, percentage);
}

function loadSplit() {
    const isVerticalLayout = window.matchMedia('(orientation: portrait)').matches;
    const orientation = isVerticalLayout ? 'vertical' : 'horizontal';
    return localStorage.getItem('split-' + orientation) || 50; // default to 50%
}

function applySplit() {
    const percentage = loadSplit();
    if (window.matchMedia('(orientation: portrait)').matches) {
        document.querySelector('.top-panel').style.flex = `0 0 ${percentage}%`;
        document.querySelector('.bottom-panel').style.flex = `0 0 ${100 - percentage}%`;
    } else {
        document.querySelector('.left-panel').style.flex = `0 0 ${percentage}%`;
        document.querySelector('.right-panel').style.flex = `0 0 ${100 - percentage}%`;
    }
}

function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Split view functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initially render content in panels
    for (const orientation of ['-horizontal', '-vertical']) {
        renderText(document.getElementById('text-panel' + orientation));
        renderChat(document.getElementById('chat-panel' + orientation));
    }

    // Get elements
    const horizontalSplit = document.querySelector('.horizontal');
    const verticalSplit = document.querySelector('.vertical');
    const splitHandle = document.querySelector('.horizontal .split-handle');
    const verticalSplitHandle = document.querySelector('.vertical .split-handle');

    // Variables to track dragging state
    let isDragging = false;
    let percentage = loadSplit(); // Load split percentage

    // Horizontal split functionality (side-by-side panels)
    splitHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    // Vertical split functionality (stacked panels)
    verticalSplitHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'row-resize';
        e.preventDefault();
    });

    // Handle mouse movement during drag
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Determine which layout is active
        const isVerticalLayout = window.matchMedia('(orientation: portrait)').matches;

        if (isVerticalLayout) {
            // Handle vertical layout (panels stacked)
            const topPanel = document.querySelector('.top-panel');
            const bottomPanel = document.querySelector('.bottom-panel');

            // Calculate position relative to vertical container
            const containerRect = verticalSplit.getBoundingClientRect();
            let yPos = e.clientY - containerRect.top;

            // Calculate percentage and constrain to container bounds
            percentage = Math.min(Math.max((yPos / containerRect.height) * 100, 10), 90);

            // Apply new sizes
            topPanel.style.flex = `0 0 ${percentage}%`;
            bottomPanel.style.flex = `0 0 ${100 - percentage}%`;
        } else {
            // Handle horizontal layout (side-by-side panels)
            const leftPanel = document.querySelector('.left-panel');
            const rightPanel = document.querySelector('.right-panel');

            // Calculate position relative to horizontal container
            const containerRect = horizontalSplit.getBoundingClientRect();
            let xPos = e.clientX - containerRect.left;

            // Calculate percentage and constrain to container bounds
            percentage = Math.min(Math.max((xPos / containerRect.width) * 100, 10), 90);

            // Apply new sizes
            leftPanel.style.flex = `0 0 ${percentage}%`;
            rightPanel.style.flex = `0 0 ${100 - percentage}%`;
        }
    });

    // Stop dragging when mouse is released
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
            saveSplit(percentage);
            // Notify other modules of resize
            window.dispatchEvent(new Event('resize'));
        }
    });

    // Touch events for mobile devices
    splitHandle.addEventListener('touchstart', (e) => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        if (e.cancelable) {
            e.preventDefault();
        }
    });

    verticalSplitHandle.addEventListener('touchstart', (e) => {
        isDragging = true;
        document.body.style.cursor = 'row-resize';
        if (e.cancelable) {
            e.preventDefault();
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        // Determine which layout is active
        const isVerticalLayout = window.matchMedia('(orientation: portrait)').matches;

        if (isVerticalLayout) {
            // Handle vertical layout (panels stacked)
            const topPanel = document.querySelector('.top-panel');
            const bottomPanel = document.querySelector('.bottom-panel');

            // Calculate position relative to vertical container
            const containerRect = verticalSplit.getBoundingClientRect();
            let yPos = e.touches[0].clientY - containerRect.top;

            // Calculate percentage and constrain to container bounds
            percentage = Math.min(Math.max((yPos / containerRect.height) * 100, 10), 90);

            // Apply new sizes
            topPanel.style.flex = `0 0 ${percentage}%`;
            bottomPanel.style.flex = `0 0 ${100 - percentage}%`;
        } else {
            // Handle horizontal layout (side-by-side panels)
            const leftPanel = document.querySelector('.left-panel');
            const rightPanel = document.querySelector('.right-panel');

            // Calculate position relative to horizontal container
            const containerRect = horizontalSplit.getBoundingClientRect();
            let xPos = e.touches[0].clientX - containerRect.left;

            // Calculate percentage and constrain to container bounds
            percentage = Math.min(Math.max((xPos / containerRect.width) * 100, 10), 90);

            // Apply new sizes
            leftPanel.style.flex = `0 0 ${percentage}%`;
            rightPanel.style.flex = `0 0 ${100 - percentage}%`;
        }
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
            saveSplit(percentage);
            // Notify other modules of resize
            window.dispatchEvent(new Event('resize'));
        }
    });

    // Handle window resize to switch between layouts
    window.addEventListener('resize', debounce(() => {
        applySplit();
    }, 100)); // 100ms debounce
});