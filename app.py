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
from datetime import datetime

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
        assigned_vars = data.get('assigned_vars', {})
        
        # 空の方程式を除去
        equations = [eq.strip() for eq in equations if eq.strip()]
        solve_vars = [var.strip() for var in solve_vars if var.strip()]
        
        if not equations:
            return jsonify({'error': '少なくとも1つの方程式を入力してください。'})
        
        # 記号をすべて抽出
        all_texts = equations + solve_vars + list(assigned_vars.keys())
        symbol_names = extract_symbols_from_texts(all_texts)
        
        # 求める変数が空なら自動検知
        if not solve_vars:
            detected_symbols = list(extract_symbols_from_texts(equations))
            # 代入済みの変数は解く対象から外す
            solve_vars = [s for s in detected_symbols if s not in assigned_vars.keys()]
            if not solve_vars:
                if detected_symbols:
                     return jsonify({'error': '解くべき変数がありません。すべての変数が代入済みです。'})
                else:
                     return jsonify({'error': '変数が検出できませんでした。'})

        # SymPyの記号を定義
        if symbol_names:
            symbols(','.join(symbol_names))
        # symbol_names から locals 辞書を作成し、E も変数扱い
        locals_dict = {name: symbols(name) for name in symbol_names}
        # 方程式をSymPy形式に変換
        eq_list = []
        for eq_str in equations:
            eq_str = preprocess_equation(eq_str, symbol_names)
            if '=' in eq_str:
                left, right = eq_str.split('=')
                left_expr = sympify(left, locals=locals_dict)
                right_expr = sympify(right, locals=locals_dict)
                eq = Eq(left_expr, right_expr)
            else:
                eq = sympify(eq_str, locals=locals_dict)
            eq_list.append(eq)
        
        # 値を代入
        if assigned_vars:
            substitutions = {symbols(k): sympify(v) for k, v in assigned_vars.items() if v is not None and str(v).strip() != ''}
            if substitutions:
                eq_list = [eq.subs(substitutions) for eq in eq_list]
        
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

@app.route('/auto_detect_assignable_vars', methods=['POST'])
def auto_detect_assignable_vars():
    """方程式から代入可能な変数を自動検出"""
    try:
        data = request.get_json()
        equations = data.get('equations', [])
        solve_vars = data.get('solve_vars', [])
        
        equations = [eq.strip() for eq in equations if eq.strip()]
        solve_vars = [var.strip() for var in solve_vars if var.strip()]
        
        if not equations:
            return jsonify({'variables': []})
        
        # 方程式からすべての変数を検出
        all_vars = extract_symbols_from_texts(equations)
        
        # 解く変数として指定されているものを除外
        assignable_vars = [v for v in all_vars if v not in solve_vars]
        
        return jsonify({'variables': assignable_vars})
        
    except Exception as e:
        return jsonify({'error': f'変数検出エラー: {str(e)}'})

@app.route('/export', methods=['POST'])
def export_eqsl():
    """計算データを.eqslファイルとしてエクスポート"""
    try:
        data = request.get_json()
        
        # エクスポートするデータを構造化
        export_data = {
            "version": "1.0",
            "timestamp": datetime.now().isoformat(),
            "input_data": {
                "equations": data.get('equations', []),
                "solve_vars": data.get('solve_vars', []),
                "assigned_vars": data.get('assigned_vars', {})
            },
            "results": data.get('results', [])
        }
        
        # JSONファイルとして生成
        json_str = json.dumps(export_data, ensure_ascii=False, indent=2)
        
        # バイトストリームに変換
        buffer = io.BytesIO()
        buffer.write(json_str.encode('utf-8'))
        buffer.seek(0)
        
        # ファイル名を生成（タイムスタンプ付き）
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"equation_solver_{timestamp}.eqsl"
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/json'
        )
        
    except Exception as e:
        return jsonify({'error': f'エクスポートエラー: {str(e)}'}), 500

@app.route('/import', methods=['POST'])
def import_eqsl():
    """計算データを.eqslファイルからインポート"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'ファイルが選択されていません'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'ファイルが選択されていません'}), 400
        
        if not file.filename.endswith('.eqsl'):
            return jsonify({'error': '拡張子が.eqslのファイルを選択してください'}), 400
        
        # ファイル内容を読み込み
        file_content = file.read().decode('utf-8')
        data = json.loads(file_content)
        
        # データの検証
        if 'version' not in data or 'input_data' not in data:
            return jsonify({'error': '無効なファイル形式です'}), 400
        
        return jsonify({'success': True, 'data': data})
        
    except json.JSONDecodeError:
        return jsonify({'error': 'JSONファイルの解析に失敗しました'}), 400
    except Exception as e:
        return jsonify({'error': f'インポートエラー: {str(e)}'}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
