// 自执行匿名函数，避免污染全局变量，启用严格模式保证代码规范性
(function() {
    'use strict';

    // 配置项常量：集中管理所有可配置参数，便于后续修改
    const CONFIG = {
        LABEL_STYLE: `.color-label{
            background:rgba(0,0,0,0.85);
            color:#fff;
            padding:4px 12px;
            border-radius:16px;
            font:12px/1.4 Arial,sans-serif;
            white-space:nowrap;
            z-index:9999;
            box-shadow:0 2px 8px rgba(0,0,0,0.2);
            backdrop-filter:blur(4px);
            transition:all 0.3s ease;
            margin:2px 0;
            opacity:0;
            max-width:200px;
            text-overflow:ellipsis;
            overflow:hidden;
        }
        .labels-container{
            position:absolute;
            left:50%;
            transform:translateX(-50%);
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:4px;
            pointer-events:none;
            min-width:100%;
        }
        .swatch-wrapper{
            position:relative;
            display:inline-block;
            margin:12px;
            vertical-align:top;
        }`,
        EXTRACT_DELAY: 1500,    // 颜色提取延迟时间（毫秒）
        DEBOUNCE_TIME: 300,     // 防抖延迟时间（毫秒）
        LABEL_MARGIN: 8,        // 标签外边距
        MAX_RETRIES: 3,         // 布局计算最大重试次数
        COLUMN_COUNT: 10        // 颜色列表网格列数
    };

    // 1. 移除分页/轮播样式，将颜色列表改为网格布局
    function removePagination() {
        const colorList = document.querySelector('.dimension-values-list.dimension-values-carousel');
        if (colorList) {
            // 移除轮播相关类名
            colorList.classList.remove('dimension-values-carousel');
            
            // 设置网格布局样式，替代原有轮播样式
            colorList.style.cssText = `
                grid-template-columns: repeat(${CONFIG.COLUMN_COUNT}, minmax(80px, 1fr)) !important;
                grid-template-areas: none !important;
                -webkit-mask-image: none !important;
                padding: 10px !important;
                overflow-x: auto !important;
                overflow-y: visible !important;
                gap: 10px !important;
                width: 100% !important;
            `;

            // 找到父容器并优化样式
            const parentContainer = colorList.closest('#tp-inline-twister-dim-values-container, .a-section');
            if (parentContainer) {
                parentContainer.style.width = '100% !important';
                parentContainer.style.overflow = 'visible !important';
                parentContainer.style.maxWidth = 'none !important';
            }

            console.log('颜色选项已固定列数，缩放窗口不改变排版');
        } else {
            console.log('未找到颜色列表容器');
        }
    }

    // 2. 初始化样式：将标签样式注入页面头部
    function initStyles() {
        const style = document.createElement('style');
        style.textContent = CONFIG.LABEL_STYLE;
        document.head.appendChild(style);
    }

    // 3. 颜色标准化工具：去重、格式化颜色名称（闭包缓存已处理元素）
    const colorNormalizer = (() => {
        // 弱映射缓存，避免内存泄漏，存储已处理的元素
        const seen = new WeakMap();

        return {
            // 格式化颜色名称：移除-short后缀、合并多余空格、去除首尾空白
            normalize: (color) => {
                return color.replace(/-short\b/gi, '').replace(/\s{2,}/g, ' ').trim();
            },

            // 判断颜色和元素是否唯一（避免重复处理）
            isUnique: (element, color) => {
                const key = color.toLowerCase();
                if (seen.has(element)) return false;
                seen.set(element, key);
                return true;
            },

            // 清空缓存
            clearCache: () => {
                seen.clear();
            }
        };
    })();

    // 4. 计算布局：判断标签应该显示在图片上方还是下方（避免超出视口）
    function calculateLayout(container, retry = 0) {
        const img = container.querySelector('img');
        
        // 终止条件：无图片或达到最大重试次数
        if (!img || retry >= CONFIG.MAX_RETRIES) {
            return { position: 'bottom', offset: 0 };
        }

        try {
            // 获取图片和标签容器的布局信息
            const imgRect = img.getBoundingClientRect();
            const labelsContainer = container.querySelector('.labels-container');

            // 无标签容器则直接返回
            if (!labelsContainer || !labelsContainer.children.length) {
                return;
            }

            // 计算所有标签的总高度（包含间距）
            const labelHeights = Array.from(labelsContainer.children).map(label => label.offsetHeight || 24);
            const totalHeight = labelHeights.reduce((a, b) => a + b, 0) + (labelHeights.length - 1) * 4;
            
            // 计算图片上下方的可用空间
            const spaceBelow = window.innerHeight - imgRect.bottom;
            const spaceAbove = imgRect.top;

            // 判断最优显示位置：优先下方，其次上方，否则重试
            if (spaceBelow > totalHeight + 20) {
                return { position: 'bottom', offset: totalHeight + CONFIG.LABEL_MARGIN };
            } else if (spaceAbove > totalHeight + 20) {
                return { position: 'top', offset: totalHeight + CONFIG.LABEL_MARGIN };
            } else {
                return calculateLayout(container, retry + 1);
            }
        } catch (e) {
            console.warn('布局计算异常，尝试重试...', e);
            return calculateLayout(container, retry + 1);
        }
    }

    // 5. 创建颜色标签：为每个颜色元素生成对应的标签容器和标签
    function createLabels(colorData) {
        colorData.forEach(({ element, color }) => {
            // 跳过已处理过的元素
            if (element.classList.contains('processed')) return;
            element.classList.add('processed');

            // 查找或创建包装器
            let wrapper = element.closest('.swatch-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.className = 'swatch-wrapper';
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
            }

            // 查找或创建标签容器
            let labelsContainer = wrapper.querySelector('.labels-container');
            if (!labelsContainer) {
                labelsContainer = document.createElement('div');
                labelsContainer.className = 'labels-container';
                wrapper.appendChild(labelsContainer);
            }

            // 清空原有标签并创建新标签
            labelsContainer.innerHTML = '';
            const label = document.createElement('div');
            label.className = 'color-label';
            label.textContent = color;
            labelsContainer.appendChild(label);

            // 强制更新布局
            forceLayoutUpdate(wrapper);
        });
    }

    // 6. 强制更新布局：根据计算结果调整标签容器的位置
    function forceLayoutUpdate(container) {
        if (!container || !container.isConnected) return;

        const layout = calculateLayout(container);
        const labelsContainer = container.querySelector('.labels-container');
        const img = container.querySelector('img');

        // 无效元素直接移除
        if (!labelsContainer || !img) {
            container.remove();
            return;
        }

        // 重置标签容器样式
        labelsContainer.style.cssText = '';

        // 根据布局结果设置位置和外边距
        if (layout.position === 'bottom') {
            labelsContainer.style.bottom = `${layout.offset}px`;
            container.style.marginBottom = `${layout.offset + 8}px`;
        } else {
            labelsContainer.style.top = `${layout.offset}px`;
            container.style.marginTop = `${layout.offset + 8}px`;
        }

        // 动画显示标签（通过requestAnimationFrame保证渲染流畅）
        requestAnimationFrame(() => {
            Array.from(labelsContainer.children).forEach(label => {
                label.style.opacity = '1';
            });
        });
    }

    // 7. 提取颜色数据：从页面元素中获取并标准化颜色信息
    async function extractColors() {
        // 等待指定延迟，确保页面元素完全加载
        await new Promise(resolve => setTimeout(resolve, CONFIG.EXTRACT_DELAY));

        const elementMap = new Map();
        // 颜色图片选择器列表（覆盖多种页面结构）
        const selectors = [
            'li[id^="color_name_"] img',
            'img.imgSwatch',
            'img.a-color-swatch',
            '[data-asin] img.swatch-image[alt]'
        ];

        // 遍历所有选择器，提取颜色数据
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(img => {
                try {
                    // 跳过已处理元素的后代
                    if (img.closest('.processed')) return;

                    // 提取并标准化颜色名称
                    const rawColor = img.alt.trim();
                    const normalized = colorNormalizer.normalize(rawColor);

                    // 仅处理唯一且有效的颜色
                    if (normalized && colorNormalizer.isUnique(img, normalized)) {
                        const container = img.closest('[data-asin], li') || img.parentElement;
                        // 避免重复存储同一容器的颜色数据
                        if (!elementMap.has(container)) {
                            elementMap.set(container, {
                                element: container,
                                color: normalized,
                                imageUrl: img.src
                            });
                        }
                    }
                } catch (e) {
                    console.warn('元素处理异常:', e);
                }
            });
        });

        // 转换为数组返回
        return Array.from(elementMap.values());
    }

    // 8. 防抖处理：避免重复执行颜色处理逻辑
    let processing = false;
    async function debouncedProcess() {
        if (processing) return;

        try {
            processing = true;
            // 提取颜色数据并创建标签
            const colors = await extractColors();
            if (colors.length) createLabels(colors);
        } catch (error) {
            console.error('Color Processing Error:', error);
        } finally {
            // 防抖延迟后重置状态，并更新所有布局
            setTimeout(() => {
                processing = false;
                document.querySelectorAll('.swatch-wrapper').forEach(forceLayoutUpdate);
            }, CONFIG.DEBOUNCE_TIME);
        }
    }

    // 9. 设置事件监听器：响应窗口大小变化和滚动事件
    function setupEventListeners() {
        // 窗口大小变化防抖处理
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.querySelectorAll('.swatch-wrapper').forEach(wrapper => {
                    wrapper.isConnected ? forceLayoutUpdate(wrapper) : wrapper.remove();
                });
                colorNormalizer.clearCache();
            }, 200);
        });

        // 页面滚动防抖处理
        let scrollTimer;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                document.querySelectorAll('.swatch-wrapper').forEach(wrapper => {
                    wrapper.isConnected && forceLayoutUpdate(wrapper);
                });
            }, 100);
        });
    }

    // 10. 初始化核心逻辑：整合所有步骤，启动功能
    function init() {
        // 注入样式
        initStyles();
        // 移除轮播，改为网格布局
        removePagination();
        // 首次处理颜色数据
        debouncedProcess();
        // 绑定窗口事件
        setupEventListeners();

        // 监听页面DOM变化，自动重新处理（应对动态加载内容）
        new MutationObserver((mutations) => {
            let shouldProcess = false;
            // 判断是否需要重新处理（元素新增、类名/样式变化）
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length || 
                    mutation.attributeName === 'class' || 
                    mutation.attributeName === 'style') {
                    shouldProcess = true;
                }
            });

            if (shouldProcess) {
                removePagination();
                debouncedProcess();
            }
        }).observe(document.body, {
            childList: true,    // 监听子元素增删
            subtree: true,      // 监听所有后代元素
            attributes: true,   // 监听元素属性变化
            attributeFilter: ['class', 'style']  // 仅监听class和style属性
        });
    }

    // 消息监听器：接收来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'showColors') {
            try {
                init();
                sendResponse({ success: true });
            } catch (e) {
                console.error('显示颜色失败:', e);
                sendResponse({ success: false });
            }
            return true; // 保持消息通道开放
        }
    });
})();