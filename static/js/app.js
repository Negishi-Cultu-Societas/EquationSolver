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
    
    // 通信テスト実行
    setTimeout(() => {
        testConnection().then(success => {
            if (!success) {
                showError(
                    'サーバーとの通信に問題があります', 
                    'connection-error',
                    'サーバーが起動しているか確認してください。\nブラウザの開発者ツール（F12）でエラーを確認してください。'
                );
            }
        });
    }, 1000);
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
    
    // エクスポート・インポートボタン
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importBtn) importBtn.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', handleImportFile);
    
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
        
        // 送信データをログ出力
        const requestData = {
            equations: equations,
            solve_vars: variables,
            assigned_vars: assignedVars
        };
        console.log('Sending request:', requestData);
        
        const response = await fetch('/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
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
        console.error('Fetch error details:', error);
        
        let errorMessage = '計算中にエラーが発生しました。';
        let errorDetails = 'ネットワーク接続を確認するか、しばらくしてから再試行してください。';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'サーバーに接続できません。';
            errorDetails = 'サーバーが起動しているか確認してください。\nURL: http://localhost:5000 または http://127.0.0.1:5000';
        } else if (error.message.includes('HTTP')) {
            errorMessage = `サーバーエラー: ${error.message}`;
            errorDetails = 'サーバーログを確認してください。';
        }
        
        showError(errorMessage, 'calculation-error', errorDetails);
        resultContent.innerHTML = '';
    } finally {
        showLoading(false);
    }
}

// 結果表示関数
function displayResults(solutions) {
    resultContent.innerHTML = '';
    
    if (!solutions || solutions.length === 0) {
        resultContent.innerHTML = '<p>解が見つかりませんでした。</p>';
        resultSection.style.display = 'block';
        return;
    }
    
    solutions.forEach(solution => {
        const solutionItem = document.createElement('div');
        solutionItem.className = 'solution-item';
        
        const solutionLabel = document.createElement('div');
        solutionLabel.className = 'solution-label';
        solutionLabel.textContent = solution.label;
        solutionItem.appendChild(solutionLabel);
        
        if (solution.variables && solution.variables.length > 0) {
            const solutionVars = document.createElement('div');
            solutionVars.className = 'solution-vars';
            
            solution.variables.forEach(variable => {
                const solutionVar = document.createElement('div');
                solutionVar.className = 'solution-var';
                // LaTeX形式で表示
                solutionVar.innerHTML = `\\(${variable.var} = ${variable.value}\\)`;
                solutionVars.appendChild(solutionVar);
            });
            
            solutionItem.appendChild(solutionVars);
        }
        
        resultContent.appendChild(solutionItem);
    });
    
    resultSection.style.display = 'block';
    
    // MathJaxで数式をレンダリング
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([resultContent]).catch(function (err) {
            console.log('MathJax typeset error: ' + err.message);
        });
    }
}

// ローディング表示制御
function showLoading(show) {
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

// エクスポート・インポート機能
function exportData() {
    try {
        // 現在の入力データを取得
        const equations = getEquations();
        const solveVars = getVariables(); // 修正: getSolveVars() → getVariables()
        const assignedVars = getAssignedVariables(); // 修正: getAssignedVars() → getAssignedVariables()
        const results = getCurrentResults();
        
        const exportData = {
            equations: equations,
            solve_vars: solveVars,
            assigned_vars: assignedVars,
            results: results
        };
        
        console.log('エクスポートデータ:', exportData); // デバッグ用ログ追加
        
        // サーバーにエクスポートリクエストを送信
        fetch('/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(exportData)
        })
        .then(response => {
            console.log('エクスポートレスポンス:', response.status); // デバッグ用ログ追加
            if (!response.ok) {
                throw new Error('エクスポートに失敗しました');
            }
            return response.blob();
        })
        .then(blob => {
            console.log('ダウンロード開始:', blob.size, 'bytes'); // デバッグ用ログ追加
            // ファイルダウンロード
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `equation_solver_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showMessage('データをエクスポートしました', 'success');
        })
        .catch(error => {
            console.error('エクスポートエラー:', error);
            showError('エクスポートに失敗しました: ' + error.message);
        });
    } catch (error) {
        console.error('エクスポートエラー:', error);
        showError('エクスポートに失敗しました: ' + error.message);
    }
}

// インポート機能
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        showError('拡張子が.jsonのファイルを選択してください。');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            importData(data);
        } catch (error) {
            console.error('インポートエラー:', error);
            showError('ファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // ファイル選択をリセット
    event.target.value = '';
}

function importData(data) {
    try {
        // データの検証
        if (!data.input_data) {
            throw new Error('無効なファイル形式です。');
        }
        
        const inputData = data.input_data;
        
        // 現在のデータをクリア
        allClear();
        
        // 方程式を復元
        if (inputData.equations && inputData.equations.length > 0) {
            inputData.equations.forEach((equation, index) => {
                if (index === 0) {
                    // 最初の方程式は既に存在するので値をセット
                    const firstInput = equationsContainer.querySelector('.equation-input');
                    if (firstInput) {
                        firstInput.value = equation;
                    }
                } else {
                    // 追加の方程式を作成
                    addEquation();
                    const inputs = equationsContainer.querySelectorAll('.equation-input');
                    const lastInput = inputs[inputs.length - 1];
                    if (lastInput) {
                        lastInput.value = equation;
                    }
                }
            });
        }
        
        // 求める変数を復元
        if (inputData.solve_vars && inputData.solve_vars.length > 0) {
            inputData.solve_vars.forEach((variable, index) => {
                addVariable();
                const inputs = variablesContainer.querySelectorAll('.variable-input');
                const lastInput = inputs[inputs.length - 1];
                if (lastInput) {
                    lastInput.value = variable;
                }
            });
        }
        
        // 代入変数を復元
        if (inputData.assigned_vars && Object.keys(inputData.assigned_vars).length > 0) {
            // 最初の代入変数エリアをクリア
            const firstItem = assignedVariablesContainer.querySelector('.assigned-variable-item');
            if (firstItem) {
                const nameInput = firstItem.querySelector('.assigned-variable-name');
                const valueInput = firstItem.querySelector('.assigned-variable-value');
                const firstKey = Object.keys(inputData.assigned_vars)[0];
                if (nameInput && valueInput && firstKey) {
                    nameInput.value = firstKey;
                    valueInput.value = inputData.assigned_vars[firstKey];
                }
                
                // 残りの代入変数を追加
                const remainingKeys = Object.keys(inputData.assigned_vars).slice(1);
                remainingKeys.forEach(key => {
                    addAssignedVariable();
                    const items = assignedVariablesContainer.querySelectorAll('.assigned-variable-item');
                    const lastItem = items[items.length - 1];
                    const nameInput = lastItem.querySelector('.assigned-variable-name');
                    const valueInput = lastItem.querySelector('.assigned-variable-value');
                    if (nameInput && valueInput) {
                        nameInput.value = key;
                        valueInput.value = inputData.assigned_vars[key];
                    }
                });
            }
        }
        
        // 結果を復元（もしあれば）
        if (data.results && data.results.length > 0) {
            displayImportedResults(data.results);
        }
        
        showMessage('データをインポートしました', 'success');
        
    } catch (error) {
        console.error('インポートエラー:', error);
        showError('データのインポートに失敗しました: ' + error.message);
    }
}

// インポートした結果を表示
function displayImportedResults(results) {
    resultContent.innerHTML = '';
    
    results.forEach(result => {
        const solutionItem = document.createElement('div');
        solutionItem.className = 'solution-item';
        
        const solutionLabel = document.createElement('div');
        solutionLabel.className = 'solution-label';
        solutionLabel.textContent = result.label;
        solutionItem.appendChild(solutionLabel);
        
        if (result.variables && result.variables.length > 0) {
            const solutionVars = document.createElement('div');
            solutionVars.className = 'solution-vars';
            
            result.variables.forEach(variable => {
                const solutionVar = document.createElement('div');
                solutionVar.className = 'solution-var';
                solutionVar.innerHTML = variable.content;
                solutionVars.appendChild(solutionVar);
            });
            
            solutionItem.appendChild(solutionVars);
        }
        
        resultContent.appendChild(solutionItem);
    });
    
    resultSection.style.display = 'block';
    
    // MathJaxで数式をレンダリング
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([resultContent]).catch(function (err) {
            console.log('MathJax typeset error: ' + err.message);
        });
    }
}

// メッセージ表示関数
function showMessage(message, type = 'info') {
    // 簡易メッセージ表示（コンソールログまたはアラート）
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (type === 'success') {
        // 成功メッセージの場合は一時的に画面に表示
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-weight: bold;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
}

// エラー表示・非表示関数
function showError(message, type = 'error', details = '') {
    if (errorMessage && errorContent) {
        errorContent.innerHTML = `
            <span class="error-main">${message}</span>
            ${details ? `<div class="error-details">${details}</div>` : ''}
        `;
        errorMessage.style.display = 'block';
        
        // エラータイプに応じてスタイル調整（必要に応じて）
        console.error(`[${type.toUpperCase()}] ${message}`, details);
    } else {
        // フォールバック: アラート表示
        alert(`エラー: ${message}\n${details}`);
    }
}

function hideError() {
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

// モーダル表示・非表示
function showSymbolsModal() {
    if (symbolsModal) {
        symbolsModal.style.display = 'block';
    }
}

function hideSymbolsModal() {
    if (symbolsModal) {
        symbolsModal.style.display = 'none';
    }
}

// ヘルパー関数: 現在の入力データを取得
function getEquations() {
    const equations = [];
    const inputs = equationsContainer.querySelectorAll('.equation-input');
    inputs.forEach(input => {
        if (input.value.trim()) {
            equations.push(input.value.trim());
        }
    });
    return equations;
}

function getVariables() {
    const variables = [];
    const inputs = variablesContainer.querySelectorAll('.variable-input');
    inputs.forEach(input => {
        if (input.value.trim()) {
            variables.push(input.value.trim());
        }
    });
    return variables;
}

function getAssignedVariables() {
    const assignedVars = {};
    const items = assignedVariablesContainer.querySelectorAll('.assigned-variable-item');
    items.forEach(item => {
        const nameInput = item.querySelector('.assigned-variable-name');
        const valueInput = item.querySelector('.assigned-variable-value');
        if (nameInput && valueInput && nameInput.value.trim() && valueInput.value.trim()) {
            assignedVars[nameInput.value.trim()] = valueInput.value.trim();
        }
    });
    return assignedVars;
}

// 現在の結果を取得する関数
function getCurrentResults() {
    const resultContent = document.getElementById('result-content');
    if (!resultContent || !resultContent.innerHTML.trim()) {
        return [];
    }
    
    // 結果データを抽出
    const solutionItems = resultContent.querySelectorAll('.solution-item');
    const results = [];
    
    solutionItems.forEach((item, index) => {
        const label = item.querySelector('.solution-label')?.textContent || `解 ${index + 1}:`;
        const variables = [];
        
        const solutionVars = item.querySelectorAll('.solution-var');
        solutionVars.forEach(varElement => {
            variables.push({
                content: varElement.innerHTML
            });
        });
        
        results.push({
            label: label,
            variables: variables
        });
    });
    
    return results;
}

// 通信診断関数
async function testConnection() {
    console.log('=== 通信診断開始 ===');
    
    // 1. 基本的な接続テスト
    try {
        const response = await fetch('/', {
            method: 'GET',
            cache: 'no-cache'
        });
        console.log('✓ 基本接続テスト成功:', response.status);
    } catch (error) {
        console.error('✗ 基本接続テストエラー:', error);
        return false;
    }
    
    // 2. JSONエンドポイントテスト
    try {
        const response = await fetch('/auto_detect_vars', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ equations: ['x + 1 = 0'] })
        });
        const data = await response.json();
        console.log('✓ JSONエンドポイントテスト成功:', data);
    } catch (error) {
        console.error('✗ JSONエンドポイントテストエラー:', error);
        return false;
    }
    
    console.log('=== 通信診断完了 ===');
    return true;
}

// エクスポートのデバッグ・テスト関数
function testExport() {
    console.log('=== エクスポートテスト開始 ===');
    
    // 1. 現在のデータを確認
    const equations = getEquations();
    const variables = getVariables();
    const assignedVars = getAssignedVariables();
    const results = getCurrentResults();
    
    console.log('方程式:', equations);
    console.log('求める変数:', variables);
    console.log('代入変数:', assignedVars);
    console.log('結果:', results);
    
    // 2. エクスポートボタンの存在確認
    const exportBtn = document.getElementById('export-btn');
    console.log('エクスポートボタン:', exportBtn);
    
    if (!exportBtn) {
        console.error('✗ エクスポートボタンが見つかりません');
        return false;
    }
    
    // 3. データが空でもエクスポートを実行
    exportData();
    
    console.log('=== エクスポートテスト完了 ===');
    return true;
}

// 手動テスト用（コンソールから呼び出し可能）
window.testExport = testExport;
