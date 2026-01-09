// 自执行匿名函数，避免污染全局变量
(function() {
    // 辅助函数：创建并显示提示信息（复用代码，减少冗余）
    function showTipMessage(text, bgColor) {
        const tipElement = document.createElement('div');
        tipElement.textContent = text;
        // 统一设置提示框样式
        tipElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            background: ${bgColor};
            color: white;
            border-radius: 4px;
            z-index: 9999;
            font-size: 14px;
        `;
        document.body.appendChild(tipElement);

        // 2秒后自动移除提示框
        setTimeout(() => {
            tipElement.remove();
        }, 2000);
    }

    // 核心复制功能函数
    function copyBrandAndUrl() {
        // 1. 获取当前页面URL和目标元素
        const currentUrl = window.location.href;
        const bylineInfoElement = document.getElementById('bylineInfo');

        // 2. 检查目标元素是否存在
        if (bylineInfoElement) {
            // 3. 提取元素文本并匹配品牌名称
            const elementText = bylineInfoElement.textContent.trim();
            // 修复原代码中的URL编码%20，直接替换为空格
            const brandMatch = elementText.match(/Visit the (.*?) Store/);
            // 若匹配到品牌则取值，否则显示默认提示
            const brandName = brandMatch ? brandMatch[1] : "未找到品牌名称";
            // 4. 拼接要复制的内容（品牌名 + 换行 + 页面URL）
            const copyContent = `${brandName}\n\n${currentUrl}`;

            // 5. 创建临时文本域用于选中内容（兼容剪贴板操作）
            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = copyContent;
            tempTextarea.style.position = 'fixed'; // 隐藏在视口外，不影响页面布局
            document.body.appendChild(tempTextarea);
            tempTextarea.select();

            try {
                // 6. 现代剪贴板API（替代废弃的document.execCommand）
                // 优先使用navigator.clipboard，兼容性更好、更安全
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(copyContent).catch(() => {
                        document.execCommand('copy');
                    });
                } else {
                    // 降级兼容旧浏览器（已废弃，仅作兜底）
                    document.execCommand('copy');
                }

                // 7. 显示复制成功提示
                showTipMessage('已复制到剪贴板', '#333');

                // 8. 返回复制成功状态
                return true;

            } catch (error) {
                // 9. 捕获复制失败异常，显示错误提示
                showTipMessage('复制失败', '#f44336');
                console.error('剪贴板复制出错：', error);

                // 10. 返回复制失败状态
                return false;

            } finally {
                // 11. 无论成功失败，都移除临时文本域
                document.body.removeChild(tempTextarea);
            }
        } else {
            // 12. 未找到目标元素，显示对应的错误提示
            showTipMessage('未找到品牌信息', '#f44336');
            return false;
        }
    }

    // 添加消息监听器，接收来自popup的消息
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'copyBrandAndUrl') {
            const success = copyBrandAndUrl();
            sendResponse({ success: success });
            return true; // 保持消息通道开放，确保sendResponse正常工作
        }
    });
})();