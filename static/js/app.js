// DOM要素の取得
const equationsContainer = document.getElementById('equations-container');
const variablesContainer = document.getElementById('variables-container');
const assignedVariablesContainer = document.getElementById('assigned-variables-container');
const addEquationBtn = document.getElementById('add-equation-btn');
const addVariableBtn = document.getElementById('add-variable-btn');
const addAssignedVariableBtn = document.getElementById('add-assigned-variable-btn');
const autoDetectAssignedBtn = document.getElementById('auto-detect-assigned-btn');
const autoDetectBtn = document.getElementById('auto-detect-btn');
const solveBtn = document.getElementById('solve-btn');
const acBtn = document.getElementById('ac-btn');
const symbolsBtn = document.getElementById('symbols-btn');
const symbolsModal = document.getElementById('symbols-modal');
const closeModal = document.querySelector('.close');
const resultSection = document.getElementById('result-section');
const resultContent = document.getElementById('result-content');
const errorMessage = document.getElementById('error-message');
const errorContent = document.getElementById('error-content');
const errorCloseBtn = document.getElementById('error-close-btn');
const loading = document.getElementById('loading');

// 方程式と変数のカウンター
let equationCount = 0;
let variableCount = 0;
let assignedVariableCount = 0;

// モバイルデバイス検出
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    addEquation(); // 最初の方程式欄を追加
    addAssignedVariable(); // 最初の変数代入欄を追加
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
    addAssignedVariableBtn.addEventListener('click', () => addAssignedVariable());
    autoDetectAssignedBtn.addEventListener('click', autoDetectAssignableVariables);
    autoDetectBtn.addEventListener('click', autoDetectVariables);
    solveBtn.addEventListener('click', solveEquations);
    acBtn.addEventListener('click', allClear);
    symbolsBtn.addEventListener('click', showSymbolsModal);
    closeModal.addEventListener('click', hideSymbolsModal);
    errorCloseBtn.addEventListener('click', hideError);
    
    // タッチデバイス対応（passive: trueでスクロールパフォーマンス向上）
    if (isTouchDevice) {
        // タッチイベントを追加（スクロールを阻害しないように）
        addEquationBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        addVariableBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        addAssignedVariableBtn.addEventListener('touchstart', function(e) {
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
        }, { passive: true });        symbolsBtn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        closeModal.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        }, { passive: true });
        errorCloseBtn.addEventListener('touchstart', function(e) {
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

// 変数代入欄を追加
function addAssignedVariable(name = '') {
    assignedVariableCount++;
    const item = document.createElement('div');
    item.className = 'assigned-variable-item';

    const inputAttributes = isMobile ?
        'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' :
        '';

    item.innerHTML = `
        <input type="text" class="assigned-variable-name" placeholder="変数名 (例: a)" value="${name}" ${inputAttributes} inputmode="text">
        <span class="equals-sign">=</span>
        <input type="text" class="assigned-variable-value" placeholder="値 (例: 1)" ${inputAttributes} inputmode="decimal">
        <button type="button" class="btn btn-remove" onclick="removeAssignedVariable(this)">削除</button>
    `;

    assignedVariablesContainer.appendChild(item);
}

// 変数代入欄を削除
function removeAssignedVariable(button) {
    const item = button.parentElement;
    item.remove();
}

// 方程式欄を削除
function removeEquation(button) {
    const item = button.parentElement;
    item.remove();
}

// 変数欄を削除
function removeVariable(button) {
    const item = button.parentElement;
    item.remove();
}

// 代入変数の自動検出
async function autoDetectAssignableVariables() {
    const equations = getEquations();
    const solve_vars = getVariables();

    if (equations.length === 0) {
        showError(
            '方程式を入力してから変数の自動検出を行ってください。',
            'input-error',
            '少なくとも1つの方程式を入力してから「自動追加」ボタンを押してください。'
        );
        return;
    }

    try {
        showLoading(true);
        const response = await fetch('/auto_detect_assignable_vars', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                equations: equations,
                solve_vars: solve_vars
            })
        });

        const data = await response.json();

        if (data.error) {
            showError(
                data.error,
                'variable-error',
                '方程式に変数が含まれているか確認してください。'
            );
        } else {
            assignedVariablesContainer.innerHTML = '';
            assignedVariableCount = 0;

            if (data.variables.length > 0) {
                data.variables.forEach(variable => {
                    addAssignedVariable(variable);
                });
            } else {
                addAssignedVariable();
            }

            hideError();
        }
    } catch (error) {
        showError(
            '変数検出中にエラーが発生しました。',
            'calculation-error',
            'ネットワーク接続を確認するか、しばらくしてから再試行してください。'
        );
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// 全クリア
function allClear() {
    // 方程式欄をクリア
    equationsContainer.innerHTML = '';
    // 変数欄をクリア
    variablesContainer.innerHTML = '';
    // 代入変数欄をクリア
    assignedVariablesContainer.innerHTML = '';
    // 結果をクリア
    resultContent.innerHTML = '';
    // エラーメッセージをクリア
    hideError();
    // カウンターをリセット
    equationCount = 0;
    variableCount = 0;
    assignedVariableCount = 0;
    // 最初の方程式欄を追加
    addEquation();
    // 最初の変数代入欄を追加
    addAssignedVariable();
}

// 変数の自動検出
async function autoDetectVariables() {
    const equations = getEquations();
    if (equations.length === 0) {
        showError(
            '方程式を入力してから変数の自動検出を行ってください。', 
            'input-error',
            '少なくとも1つの方程式を入力してから「変数自動検出」ボタンを押してください。'
        );
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
            showError(
                data.error, 
                'variable-error',
                '方程式に変数が含まれているか確認してください。例: x, y, z など'
            );
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
        showError(
            '変数検出中にエラーが発生しました。', 
            'calculation-error',
            'ネットワーク接続を確認するか、しばらくしてから再試行してください。'
        );
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

// 方程式を解く
async function solveEquations() {
    const equations = getEquations();
    const variables = getVariables();
    const assignedVars = getAssignedVariables();
    
    if (equations.length === 0) {
        showError(
            '少なくとも1つの方程式を入力してください。', 
            'input-error',
            '方程式を入力してから「解を求める」ボタンを押してください。\n例: x**2 + 2*x + 1 = 0'
        );
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
                solve_vars: variables,
                assigned_vars: assignedVars
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            // エラーメッセージの詳細分析
            let errorType = 'calculation-error';
            let errorDetails = '方程式の記法を確認してください。記号対応表を参考にしてください。';
            
            if (data.error.includes('変数') || data.error.includes('変数が検出')) {
                errorType = 'variable-error';
                errorDetails = '変数名は英字で始まる必要があります（例: x, y, abc）。';
            } else if (data.error.includes('入力') || data.error.includes('方程式')) {
                errorType = 'input-error';
                errorDetails = '方程式の書き方を確認してください。\n例: x**2 + 2*x + 1 = 0\n例: 2*x + y = 5';
            }
            
            showError(data.error, errorType, errorDetails);
            resultContent.innerHTML = '';
        } else {
            displayResults(data.solutions);
            hideError();
        }
    } catch (error) {
        showError(
            '計算中にエラーが発生しました。', 
            'calculation-error',
            'ネットワーク接続を確認するか、しばらくしてから再試行してください。\n問題が続く場合は方程式の記法を確認してください。'
        );
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

// 入力された代入変数を取得
function getAssignedVariables() {
    const assignedVars = {};
    const items = document.querySelectorAll('.assigned-variable-item');
    items.forEach(item => {
        const nameInput = item.querySelector('.assigned-variable-name');
        const valueInput = item.querySelector('.assigned-variable-value');
        const name = nameInput.value.trim();
        const value = valueInput.value.trim();
        if (name && value) {
            assignedVars[name] = value;
        }
    });
    return assignedVars;
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

// エラーメッセージを表示（強化版）
function showError(message, type = 'calculation-error', details = null) {
    // エラーコンテンツのメインテキストを設定
    errorContent.innerHTML = `<span class="error-main">${message}</span>`;
    
    // 詳細情報がある場合は追加
    if (details) {
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'error-details';
        detailsDiv.textContent = details;
        errorContent.appendChild(detailsDiv);
    }
    
    // 既存のエラータイプクラスを削除
    errorMessage.classList.remove('input-error', 'variable-error', 'calculation-error');
    
    // 新しいエラータイプクラスを追加
    errorMessage.classList.add(type);
    
    // エラーメッセージを表示
    errorMessage.style.display = 'block';
    errorMessage.style.opacity = '1';
    
    // スクロールしてエラーメッセージを表示
    errorMessage.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
    
    // 3秒後に振動効果を追加（モバイル対応）
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    // 10秒後に自動的にエラーメッセージの強調を解除（メッセージは残す）
    setTimeout(() => {
        if (errorMessage.style.display === 'block') {
            errorMessage.style.opacity = '0.7';
        }
    }, 10000);
}

// エラーメッセージを非表示
function hideError() {
    errorMessage.style.display = 'none';
    errorMessage.style.opacity = '1';
    errorMessage.classList.remove('input-error', 'variable-error', 'calculation-error');
    // エラーコンテンツもクリア
    errorContent.innerHTML = '';
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
