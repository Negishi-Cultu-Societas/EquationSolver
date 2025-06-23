from flask import Flask, render_template, request, jsonify, send_file
from sympy import symbols, Eq, solve, sympify, latex
import re
import json
import io
import base64
import matplotlib
matplotlib.use('Agg')  # GUI不要のバックエンドを使用
import matplotlib.pyplot as plt
from matplotlib import font_manager
import qrcode
import socket

app = Flask(__name__)

def extract_symbols_from_texts(texts):
    """テキストから英字で始まる変数名を抽出"""
    pattern = r'([a-zA-Z_][a-zA-Z0-9_]*)'
    found = set()
    for text in texts:
        found.update(re.findall(pattern, text))
    return found

def preprocess_equation(eq_str, symbol_names):
    """方程式の前処理：係数と変数の間に*を補う"""
    sorted_vars = sorted(symbol_names, key=len, reverse=True)
    for var in sorted_vars:
        # 数字と変数の間
        eq_str = re.sub(rf'(\d)({var})(?![a-zA-Z0-9_])', r'\1*\2', eq_str)
        # 変数と変数の間
        eq_str = re.sub(rf'({var})(?={"|".join(sorted_vars)})', lambda m: m.group(1) + '*', eq_str)
    return eq_str

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/manifest.json')
def manifest():
    return app.send_static_file('manifest.json')

@app.route('/qr')
def qr_code():
    """QRコードを生成してモバイルアクセスを簡単にする"""
    try:
        # ローカルIPアドレスを取得
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        url = f"http://{local_ip}:5000"
        
        # QRコードを生成
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        # QRコード画像を生成
        img = qr.make_image(fill_color="black", back_color="white")
        
        # バイトストリームに変換
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        return send_file(img_buffer, mimetype='image/png')
        
    except Exception as e:
        return f"QRコード生成エラー: {str(e)}", 500

def get_local_ip():
    """ローカルIPアドレスを取得"""
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        return local_ip
    except:
        return "127.0.0.1"

@app.route('/solve', methods=['POST'])
def solve_equation():
    try:
        data = request.get_json()
        equations = data.get('equations', [])
        solve_vars = data.get('solve_vars', [])
        
        # 空の方程式を除去
        equations = [eq.strip() for eq in equations if eq.strip()]
        solve_vars = [var.strip() for var in solve_vars if var.strip()]
        
        if not equations:
            return jsonify({'error': '少なくとも1つの方程式を入力してください。'})
        
        # 求める変数が空なら自動検知
        if not solve_vars:
            symbol_names = list(extract_symbols_from_texts(equations))
            if not symbol_names:
                return jsonify({'error': '変数が検出できませんでした。'})
            solve_vars = symbol_names
        else:
            all_texts = equations + solve_vars
            symbol_names = extract_symbols_from_texts(all_texts)
        
        # SymPyの記号を定義
        if symbol_names:
            symbols(','.join(symbol_names))
        
        # 方程式をSymPy形式に変換
        eq_list = []
        for eq_str in equations:
            eq_str = preprocess_equation(eq_str, symbol_names)
            if '=' in eq_str:
                left, right = eq_str.split('=')
                left = sympify(left)
                right = sympify(right)
                eq = Eq(left, right)
            else:
                eq = sympify(eq_str)
            eq_list.append(eq)
        
        # 変数の記号を作成
        vars_symbols = [symbols(v) for v in solve_vars]
        
        # 方程式を解く
        solutions = solve(eq_list, vars_symbols, dict=True)
        
        result_data = []
        if solutions:
            for i, sol in enumerate(solutions):
                solution_data = {
                    'label': f'解 {i+1}:',
                    'variables': []
                }
                for k, v in sol.items():
                    solution_data['variables'].append({
                        'var': latex(k),
                        'value': latex(v)
                    })
                result_data.append(solution_data)
        else:
            # 代数解を試す
            alt_solutions = solve(eq_list, vars_symbols, dict=False)
            if alt_solutions:
                if isinstance(alt_solutions, list):
                    for i, sol in enumerate(alt_solutions):
                        solution_data = {
                            'label': f'代数解 {i+1}:',
                            'variables': []
                        }
                        if isinstance(sol, tuple):
                            for j, v in enumerate(sol):
                                solution_data['variables'].append({
                                    'var': latex(vars_symbols[j]) if j < len(vars_symbols) else f'var_{j}',
                                    'value': latex(v)
                                })
                        else:
                            solution_data['variables'].append({
                                'var': latex(vars_symbols[0]) if vars_symbols else 'x',
                                'value': latex(sol)
                            })
                        result_data.append(solution_data)
                else:
                    result_data.append({
                        'label': '代数解:',
                        'variables': [{
                            'var': latex(vars_symbols[0]) if vars_symbols else 'x',
                            'value': latex(alt_solutions)
                        }]
                    })
            else:
                result_data.append({
                    'label': '解が見つかりませんでした。',
                    'variables': []
                })
        
        return jsonify({'success': True, 'solutions': result_data})
        
    except Exception as e:
        return jsonify({'error': f'入力エラー: {str(e)}'})

@app.route('/auto_detect_vars', methods=['POST'])
def auto_detect_vars():
    """方程式から変数を自動検出"""
    try:
        data = request.get_json()
        equations = data.get('equations', [])
        equations = [eq.strip() for eq in equations if eq.strip()]
        
        if not equations:
            return jsonify({'variables': []})
        
        symbol_names = list(extract_symbols_from_texts(equations))
        return jsonify({'variables': symbol_names})
        
    except Exception as e:
        return jsonify({'error': f'変数検出エラー: {str(e)}'})

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🔢 Equation Solver - Androidスマートフォン対応版")
    print("="*50)
    
    local_ip = get_local_ip()
    print(f"📱 PCからアクセス: http://127.0.0.1:5000")
    print(f"📱 スマートフォンからアクセス: http://{local_ip}:5000")
    print(f"📱 QRコード: http://{local_ip}:5000/qr")
    
    print("\n🚀 Androidスマートフォンでのアクセス方法:")
    print("1. スマートフォンのブラウザで上記URLにアクセス")
    print("2. または QRコードをスキャン")
    print("3. 「ホーム画面に追加」でアプリ化可能")
    
    print("\n✨ モバイル最適化機能:")
    print("- タッチ操作対応")
    print("- レスポンシブデザイン")
    print("- PWA（アプリ化）対応")
    print("- オフライン機能")
    print("- バーチャルキーボード対応")
    
    print(f"\n{'-'*50}")
    print("サーバー起動中... (Ctrl+C で停止)")
    print(f"{'-'*50}\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
