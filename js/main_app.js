document.addEventListener('DOMContentLoaded', () => {
    const navButtonsAnalytical = document.querySelectorAll('.analytical-charts-navigation .nav-button');
    const analyticalViews = document.querySelectorAll('.visualization-view');

    const mapRegionSelect = document.getElementById('map-region-select');

    const initializedModules = {
        "q1-scatter-view": true, 
        "q2-scatter-view": false,
        "q3-scatter-view": false // 添加Q3
    };
    // 这个函数用于显示特定的分析视图，并初始化或重新激活相应的模块
    function showAnalyticalView(viewId) {
        analyticalViews.forEach(view => {
            view.classList.remove('active-view');
            if (view.id === viewId) {
                view.classList.add('active-view');
                
                if (!initializedModules[viewId]) {
                    console.log(`Activating and initializing module for the first time: ${viewId}`);
                    if (viewId === 'q1-scatter-view' && typeof window.initVisualizationQ1 === 'function') {
                        // Q1 通常是自初始化的
                    } else if (viewId === 'q2-scatter-view' && typeof window.initVisualizationQ2 === 'function') {
                        window.initVisualizationQ2(); 
                        initializedModules[viewId] = true; 
                    } else if (viewId === 'q3-scatter-view' && typeof window.initVisualizationQ3 === 'function') { // 添加Q3的初始化调用
                        window.initVisualizationQ3();
                        initializedModules[viewId] = true;
                    }
                } else {
                    console.log(`Re-activating module: ${viewId}, attempting to resize chart.`);
                    if (viewId === 'q1-scatter-view' && window.q1ScatterChart && typeof window.q1ScatterChart.resize === 'function' && !window.q1ScatterChart.isDisposed()) {
                        window.q1ScatterChart.resize();
                    } else if (viewId === 'q2-scatter-view' && window.q2ScatterChart && typeof window.q2ScatterChart.resize === 'function' && !window.q2ScatterChart.isDisposed()) {
                        window.q2ScatterChart.resize();
                    } else if (viewId === 'q3-scatter-view' && window.q3ScatterChart && typeof window.q3ScatterChart.resize === 'function' && !window.q3ScatterChart.isDisposed()) { // 添加Q3的resize
                        window.q3ScatterChart.resize();
                    }
                }
            }
        });
        // 更新导航按钮的状态
        navButtonsAnalytical.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.viewId === viewId) {
                button.classList.add('active');
            }
        });
    }
    // 为每个导航按钮添加点击事件监听器
    navButtonsAnalytical.forEach(button => {
        button.addEventListener('click', () => {
            const viewIdToShow = button.dataset.viewId;
            showAnalyticalView(viewIdToShow);
        });
    });
    // 初始化时显示第一个分析视图
    if (navButtonsAnalytical.length > 0) {
        showAnalyticalView(navButtonsAnalytical[0].dataset.viewId);
    }
    // 监听全局区域选择的变化
    if (mapRegionSelect) {
        mapRegionSelect.addEventListener('change', (event) => {
            const selectedRegion = event.target.value;
            window.currentSelectedGlobalRegion = selectedRegion; 

            const regionChangeEvent = new CustomEvent('globalRegionChanged', {
                detail: { region: selectedRegion }
            });
            document.dispatchEvent(regionChangeEvent);
            console.log(`Global region changed to: ${selectedRegion}. Event dispatched.`);
        });
    }

    console.log("Main App initialized and analytical view switching is set up.");
});