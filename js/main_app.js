document.addEventListener('DOMContentLoaded', () => {
    const navButtonsAnalytical = document.querySelectorAll('.analytical-charts-navigation .nav-button');
    const analyticalViews = document.querySelectorAll('.visualization-view');

    const mapRegionSelect = document.getElementById('map-region-select');

    const initializedModules = {
        "q1-scatter-view": true, 
        "q2-scatter-view": false,
        "q3-scatter-view": false,
        "teacher-structure-view": false, // 新增
        "university-stats-view": false,  // 新增
        "education-attainment-view": false // 新增
    };

    function showAnalyticalView(viewId) {
        analyticalViews.forEach(view => {
            view.classList.remove('active-view');
            if (view.id === viewId) {
                view.classList.add('active-view');
                
                if (!initializedModules[viewId]) {
                    console.log(`Activating and initializing module for the first time: ${viewId}`);
                    if (viewId === 'q1-scatter-view' && typeof window.initVisualizationQ1 === 'function') {
                        // Q1 通常是自初始化的 (由 visualization_q1_scatter.js 内部DOMContentLoaded后执行)
                        // 但如果不是，可以在这里调用 window.initVisualizationQ1();
                    } else if (viewId === 'q2-scatter-view' && typeof window.initVisualizationQ2 === 'function') {
                        window.initVisualizationQ2(); 
                        initializedModules[viewId] = true; 
                    } else if (viewId === 'q3-scatter-view' && typeof window.initVisualizationQ3 === 'function') {
                        window.initVisualizationQ3();
                        initializedModules[viewId] = true;
                    } else if (viewId === 'teacher-structure-view' && typeof window.initTeacherStructureChart === 'function') {
                        window.initTeacherStructureChart();
                        initializedModules[viewId] = true;
                    } else if (viewId === 'university-stats-view' && typeof window.initUniversityStats === 'function') {
                        window.initUniversityStats();
                        initializedModules[viewId] = true;
                    } else if (viewId === 'education-attainment-view' && typeof window.initEducationAttainmentChart === 'function') {
                        window.initEducationAttainmentChart();
                        initializedModules[viewId] = true;
                    }
                } else {
                    console.log(`Re-activating module: ${viewId}, attempting to resize chart.`);
                    // Resize logic for existing charts
                    if (viewId === 'q1-scatter-view' && window.q1ScatterChart && typeof window.q1ScatterChart.resize === 'function' && !window.q1ScatterChart.isDisposed()) {
                        window.q1ScatterChart.resize();
                    } else if (viewId === 'q2-scatter-view' && window.q2ScatterChart && typeof window.q2ScatterChart.resize === 'function' && !window.q2ScatterChart.isDisposed()) {
                        window.q2ScatterChart.resize();
                    } else if (viewId === 'q3-scatter-view' && window.q3ScatterChart && typeof window.q3ScatterChart.resize === 'function' && !window.q3ScatterChart.isDisposed()) {
                        window.q3ScatterChart.resize();
                    } else if (viewId === 'teacher-structure-view' && window.teacherStructureChart && typeof window.teacherStructureChart.resize === 'function' && !window.teacherStructureChart.isDisposed()) {
                        window.teacherStructureChart.resize();
                        if (window.teacherEducationPieChart && typeof window.teacherEducationPieChart.resize === 'function' && !window.teacherEducationPieChart.isDisposed()) window.teacherEducationPieChart.resize();
                        if (window.teacherTitlePieChart && typeof window.teacherTitlePieChart.resize === 'function' && !window.teacherTitlePieChart.isDisposed()) window.teacherTitlePieChart.resize();
                    } else if (viewId === 'university-stats-view' && window.universityStatsChart && typeof window.universityStatsChart.resize === 'function' && !window.universityStatsChart.isDisposed()) {
                        window.universityStatsChart.resize();
                        if (window.uniTypePieChart && typeof window.uniTypePieChart.resize === 'function' && !window.uniTypePieChart.isDisposed()) window.uniTypePieChart.resize();
                        if (window.uniLevelPieChart && typeof window.uniLevelPieChart.resize === 'function' && !window.uniLevelPieChart.isDisposed()) window.uniLevelPieChart.resize();
                    } else if (viewId === 'education-attainment-view' && window.educationAttainmentChart && typeof window.educationAttainmentChart.resize === 'function' && !window.educationAttainmentChart.isDisposed()) {
                        window.educationAttainmentChart.resize();
                    }
                }
            }
        });

        navButtonsAnalytical.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.viewId === viewId) {
                button.classList.add('active');
            }
        });
    }

    navButtonsAnalytical.forEach(button => {
        button.addEventListener('click', () => {
            const viewIdToShow = button.dataset.viewId;
            showAnalyticalView(viewIdToShow);
        });
    });

    if (navButtonsAnalytical.length > 0) {
        // 确保Q1的自初始化完成后再调用showAnalyticalView，或者在showAnalyticalView中处理
        // Q1是默认激活的，它的初始化由其自身JS文件在DOMContentLoaded后触发
        // 此处调用是为了确保如果用户直接点击其他标签页，相应的模块能正确初始化
        showAnalyticalView(navButtonsAnalytical[0].dataset.viewId);
    }

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