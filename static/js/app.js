// DOM要素の取得
const equationsContainer = document.getElementById('equations-container');
const variablesContainer = document.getElementById('variables-container');
const addEquationBtn = document.getElementById('add-equation-btn');
const addVariableBtn = document.getElementById('add-variable-btn');
const autoDetectBtn = document.getElementById('auto-detect-btn');
const solveBtn = document.getElementById('solve-btn');
const acBtn = document.getElementById('ac-btn');
const symbolsBtn = document.getElementById('symbols-btn');
const symbolsModal = document.getElementById('symbols-modal');
const closeModal = document.querySelector('.close');
const resultSection = document.getElementById('result-section');
const resultContent = document.getElementById('result-content');
const errorMessage = document.getElementById('error-message');
const loading = document.getElementById('loading');

// 方程式と変数のカウンター
let equationCount = 0;
let variableCount = 0;

// モバイルデバイス検出
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    addEquation(); // 最初の方程式欄を追加
    setupEventListeners();
    setupMobileOptimizations();
});

// モバイル最適化の設定
function setupMobileOptimizations() {
    if (isMobile || isTouchDevice) {
        // ダブルタップズーム防止（入力フィールド以外）
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                // 入力フィールドやボタンの場合は preventDefault しない
                if (!event.target.matches('input, button, textarea, select, .btn')) {
                    event.preventDefault();
                }
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        // ピンチズーム防止（数式表示エリア以外）
        document.addEventListener('touchmove', function(event) {
            if (event.scale && event.scale !== 1) {
                if (!event.target.closest('.solution-var')) {
                    event.preventDefault();
                }
            }
        }, { passive: false });
        
        // バーチャルキーボード対応
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }
        
        // iOS Safariのバウンス防止（bodyのスクロールのみ）
        let isScrolling = false;
        document.body.addEventListener('touchstart', function(e) {
            // スクロール可能な要素内でのタッチは許可
            const scrollableParent = findScrollableParent(e.target);
            if (!scrollableParent && e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.body.addEventListener('touchmove', function(e) {
            // スクロール可能な要素内でのタッチムーブは許可
            const scrollableParent = findScrollableParent(e.target);
            if (!scrollableParent && e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });
    }
}

// スクロール可能な親要素を検索
function findScrollableParent(element) {
    if (!element || element === document.body) return null;
    
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    
    if (overflowY === 'scroll' || overflowY === 'auto' || overflowX === 'scroll' || overflowX === 'auto') {
        return element;
    }
    
    return findScrollableParent(element.parentElement);
}

// バーチャルキーボード表示時の対応
function handleViewportResize() {
    const viewport = window.visualViewport;
    const viewportHeight = viewport.height;
    const windowHeight = window.innerHeight;
    
    if (viewportHeight < windowHeight * 0.75) {
        // キーボードが表示されている
        document.body.style.height = `${viewportHeight}px`;
        document.body.style.overflow = 'hidden';
    } else {
        // キーボードが非表示
        document.body.style.height = '';
        document.body.style.overflow = '';
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // ボタンイベント
    addEquationBtn.addEventListener('click', addEquation);
    addVariableBtn.addEventListener('click', addVariable);
    autoDetectBtn.addEventListener('click', autoDetectVariables);
    solveBtn.addEventListener('click', solveEquations);
    acBtn.addEventListener('click', allClear);
    symbolsBtn.addEventListener('click', showSymbolsModal);
    closeModal.addEventListener('click', hideSymbolsModal);
    
    // タッチデバイス対応（passive: trueでスクロールパフォーマンス向上）
    if (isTouchDevice) {
        // タッチイベントを追加（スクロールを阻害しないように）
        addEquationBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        addVariableBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        autoDetectBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        solveBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        acBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        symbolsBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        closeModal.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
    }
    
    // モーダルの外側をクリック/タッチで閉じる
    window.addEventListener('click', function(event) {
        if (event.target === symbolsModal) {
            hideSymbolsModal();
        }
    });
    
    if (isTouchDevice) {
        window.addEventListener('touchstart', function(event) {
            if (event.target === symbolsModal) {
                hideSymbolsModal();
            }
        }, { passive: true });
    }
}

// 方程式入力欄を追加
function addEquation() {
    equationCount++;
    const equationItem = document.createElement('div');
    equationItem.className = 'equation-item';
    
    const inputAttributes = isMobile ? 
        'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' : 
        '';
    
    equationItem.innerHTML = `
        <input type="text" class="equation-input" 
               placeholder="例: x**2 + 2*x + 1 = 0" 
               id="equation-${equationCount}"
               ${inputAttributes}
               inputmode="text">
        <button type="button" class="btn btn-remove" onclick="removeEquation(this)">削除</button>
    `;
    
    equationsContainer.appendChild(equationItem);
      // モバイルでフォーカス時のズームを防ぐ
    if (isMobile) {
        const input = equationItem.querySelector('.equation-input');
        input.addEventListener('focus', function() {
            // 一時的にviewportのscaleを調整（より緩やかに）
            const viewport = document.querySelector('meta[name=viewport]');
            const originalContent = viewport.content;
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            
            setTimeout(() => {
                viewport.content = originalContent;
            }, 300);
        });
        
        input.addEventListener('blur', function() {
            // フォーカス解除時に元の設定に戻す
            const viewport = document.querySelector('meta[name=viewport]');
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=yes, minimum-scale=1.0, maximum-scale=3.0';
        });
    }
}

// 変数入力欄を追加
function addVariable() {
    variableCount++;
    const variableItem = document.createElement('div');
    variableItem.className = 'variable-item';
    
    const inputAttributes = isMobile ? 
        'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' : 
        '';
    
    variableItem.innerHTML = `
        <input type="text" class="variable-input" 
               placeholder="例: x" 
               id="variable-${variableCount}"
               ${inputAttributes}
               inputmode="text">
        <button type="button" class="btn btn-remove" onclick="removeVariable(this)">削除</button>
    `;
    
    variablesContainer.appendChild(variableItem);
      // モバイルでフォーカス時のズームを防ぐ
    if (isMobile) {
        const input = variableItem.querySelector('.variable-input');
        input.addEventListener('focus', function() {
            const viewport = document.querySelector('meta[name=viewport]');
            const originalContent = viewport.content;
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            
            setTimeout(() => {
                viewport.content = originalContent;
            }, 300);
        });
        
        input.addEventListener('blur', function() {
            const viewport = document.querySelector('meta[name=viewport]');
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=yes, minimum-scale=1.0, maximum-scale=3.0';
        });
    }
}

// 方程式入力欄を削除
function removeEquation(button) {
    const equationItem = button.parentElement;
    equationItem.remove();
}

// 変数入力欄を削除
function removeVariable(button) {
    const variableItem = button.parentElement;
    variableItem.remove();
}

// 全クリア
function allClear() {
    // 方程式欄をクリア
    equationsContainer.innerHTML = '';
    // 変数欄をクリア
    variablesContainer.innerHTML = '';
    // 結果をクリア
    resultContent.innerHTML = '';
    // エラーメッセージをクリア
    hideError();
    // カウンターをリセット
    equationCount = 0;
    variableCount = 0;
    // 最初の方程式欄を追加
    addEquation();
}

// 変数の自動検出
async function autoDetectVariables() {
    const equations = getEquations();
    if (equations.length === 0) {
        showError('方程式を入力してから変数の自動検出を行ってください。');
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch('/auto_detect_vars', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ equations: equations })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showError(data.error);
        } else {
            // 既存の変数欄をクリア
            variablesContainer.innerHTML = '';
            variableCount = 0;
            
            // 検出された変数を追加
            data.variables.forEach(variable => {
                variableCount++;
                const variableItem = document.createElement('div');
                variableItem.className = 'variable-item';
                variableItem.innerHTML = `
                    <input type="text" class="variable-input" value="${variable}" id="variable-${variableCount}">
                    <button type="button" class="btn btn-remove" onclick="removeVariable(this)">削除</button>
                `;
                variablesContainer.appendChild(variableItem);
            });
            
            hideError();
        }
    } catch (error) {
        showError('変数検出中にエラーが発生しました。');
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// 方程式を解く
async function solveEquations() {
    const equations = getEquations();
    const variables = getVariables();
    
    if (equations.length === 0) {
        showError('少なくとも1つの方程式を入力してください。');
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch('/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                equations: equations,
                solve_vars: variables
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showError(data.error);
            resultContent.innerHTML = '';
        } else {
            displayResults(data.solutions);
            hideError();
        }
    } catch (error) {
        showError('計算中にエラーが発生しました。');
        console.error('Error:', error);
        resultContent.innerHTML = '';
    } finally {
        showLoading(false);
    }
}

// 入力された方程式を取得
function getEquations() {
    const equations = [];
    const equationInputs = document.querySelectorAll('.equation-input');
    equationInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            equations.push(value);
        }
    });
    return equations;
}

// 入力された変数を取得
function getVariables() {
    const variables = [];
    const variableInputs = document.querySelectorAll('.variable-input');
    variableInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            variables.push(value);
        }
    });
    return variables;
}

// 結果を表示
function displayResults(solutions) {
    if (!solutions || solutions.length === 0) {
        resultContent.innerHTML = '<p>解が見つかりませんでした。</p>';
        return;
    }
    
    let html = '';
    solutions.forEach(solution => {
        html += `<div class="solution-item">`;
        html += `<div class="solution-label">${solution.label}</div>`;
        
        if (solution.variables && solution.variables.length > 0) {
            html += `<div class="solution-vars">`;
            solution.variables.forEach(variable => {
                html += `<div class="solution-var">$${variable.var} = ${variable.value}$</div>`;
            });
            html += `</div>`;
        }
        
        html += `</div>`;
    });
    
    resultContent.innerHTML = html;
    
    // MathJaxで数式をレンダリング
    if (window.MathJax) {
        MathJax.typesetPromise([resultContent]).catch(function (err) {
            console.log('MathJax error:', err.message);
        });
    }
}

// エラーメッセージを表示
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// エラーメッセージを非表示
function hideError() {
    errorMessage.style.display = 'none';
}

// ローディング表示/非表示
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// 記号対応表モーダルを表示
function showSymbolsModal() {
    symbolsModal.style.display = 'block';
}

// 記号対応表モーダルを非表示
function hideSymbolsModal() {
    symbolsModal.style.display = 'none';
}

// キーボードショートカット
document.addEventListener('keydown', function(event) {
    // Ctrl+Enter で方程式を解く（デスクトップのみ）
    if (!isMobile && event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        solveEquations();
    }
    
    // Escape でモーダルを閉じる
    if (event.key === 'Escape') {
        hideSymbolsModal();
    }
});

// モバイル向け追加機能
if (isMobile) {
    // スワイプジェスチャーでモーダルを閉じる
    let touchStartY = 0;
    let touchEndY = 0;
    
    symbolsModal.addEventListener('touchstart', function(event) {
        touchStartY = event.changedTouches[0].screenY;
    }, { passive: true });
    
    symbolsModal.addEventListener('touchend', function(event) {
        touchEndY = event.changedTouches[0].screenY;
        const swipeDistance = touchStartY - touchEndY;
        
        // 上方向に50px以上スワイプでモーダルを閉じる
        if (swipeDistance > 50) {
            hideSymbolsModal();
        }
    }, { passive: true });
    
    // 長押しでヘルプ（将来実装）
    let pressTimer;
    solveBtn.addEventListener('touchstart', function() {
        pressTimer = setTimeout(function() {
            // 長押し時の処理（必要に応じて実装）
            navigator.vibrate && navigator.vibrate(50); // バイブレーション
        }, 1000);
    });
    
    solveBtn.addEventListener('touchend', function() {
        clearTimeout(pressTimer);
    });
    
    solveBtn.addEventListener('touchmove', function() {
        clearTimeout(pressTimer);
    });
}
