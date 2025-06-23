import tkinter as tk
from tkinter import messagebox
from sympy import symbols, Eq, solve, sympify, latex
import re
from matplotlib import pyplot as plt

# --- スクロール対応ここから ---
root = tk.Tk()
root.title('Equation Solver')
root.geometry('750x850')
root.configure(bg='#f7f7f7')

main_canvas = tk.Canvas(root, bg='#f7f7f7', highlightthickness=0)
main_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

scrollbar = tk.Scrollbar(root, orient=tk.VERTICAL, command=main_canvas.yview)
scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
main_canvas.configure(yscrollcommand=scrollbar.set)

main_frame = tk.Frame(main_canvas, bg='#f7f7f7')
main_canvas.create_window((0, 0), window=main_frame, anchor='nw')

def on_configure(event):
    main_canvas.configure(scrollregion=main_canvas.bbox('all'))
main_frame.bind('<Configure>', on_configure)

def _on_mousewheel(event):
    main_canvas.yview_scroll(int(-1*(event.delta/120)), 'units')
main_canvas.bind_all('<MouseWheel>', _on_mousewheel)
# --- スクロール対応ここまで ---

# 解く変数・方程式のEntryリスト
solve_var_entries = []
eq_entries = []

def add_solve_var():
    frame = tk.Frame(solve_vars_frame, bg='#e3eafc')
    entry = tk.Entry(frame, width=20, font=("Yu Gothic UI", 13), bg='#fff', relief='solid', bd=1)
    entry.pack(side=tk.LEFT, padx=5, pady=6)
    def remove():
        solve_var_entries.remove((frame, entry))
        frame.destroy()
    del_button = tk.Button(frame, text='削除', command=remove, font=("Yu Gothic UI", 11), bg='#d32f2f', fg='white', activebackground='#b71c1c', activeforeground='white', relief='flat', bd=0, width=5, cursor='hand2')
    del_button.pack(side=tk.LEFT, padx=4)
    frame.pack(anchor='w', pady=6, fill='x', padx=0)
    solve_var_entries.append((frame, entry))

def add_eq():
    frame = tk.Frame(eq_frame, bg='#e3eafc')
    entry = tk.Entry(frame, width=60, font=("Yu Gothic UI", 13), bg='#fff', relief='solid', bd=1)
    entry.pack(side=tk.LEFT, padx=5, pady=6)
    def remove():
        eq_entries.remove((frame, entry))
        frame.destroy()
    del_button = tk.Button(frame, text='削除', command=remove, font=("Yu Gothic UI", 11), bg='#d32f2f', fg='white', activebackground='#b71c1c', activeforeground='white', relief='flat', bd=0, width=5, cursor='hand2')
    del_button.pack(side=tk.LEFT, padx=4)
    frame.pack(anchor='w', pady=6, fill='x', padx=0)
    eq_entries.append((frame, entry))

def get_all_solve_var_names():
    names = []
    for _, entry in solve_var_entries:
        name = entry.get().strip()
        if name:
            names.append(name)
    return names

def get_all_eqs():
    eqs = []
    for _, entry in eq_entries:
        eq_str = entry.get().strip()
        if eq_str:
            eqs.append(eq_str)
    return eqs

def extract_symbols_from_texts(texts):
    # 英字で始まる変数名（例: x, x1, foo など）を抽出
    pattern = r'([a-zA-Z_][a-zA-Z0-9_]*)'
    found = set()
    for text in texts:
        found.update(re.findall(pattern, text))
    return found

# Calculation symbols table (for display in GUI)
symbols_guide = (
    " 記号 |   入力方法   | 例\n"
    "------+-------------+---------------------\n"
    "+     | +           | x + 2\n"
    "-     | -           | x - 3\n"
    "*     | *           | 2 * x\n"
    "/     | /           | x / 5\n"
    "^     | **          | x**2\n"
    "=     | =           | x + 2 = 5\n"
    "√     | sqrt(x)     | sqrt(x)\n"
    "π     | pi          | pi * r**2\n"
    "e     | E           | E**x\n"
    "sin   | sin(x)      | sin(x)\n"
    "cos   | cos(x)      | cos(x)\n"
    "log   | log(x)      | log(x)\n"
    "log10 | log(x, 10)  | log(x, 10)\n"
)

# Style for frames and labels
frame_style = {'bg': '#f7f7f7'}
label_style = {'bg': '#f7f7f7', 'font': ("Yu Gothic UI", 13)}
entry_style = {'font': ("Yu Gothic UI", 13), 'bg': '#fff', 'relief': 'solid', 'bd': 1}
button_style = {'font': ("Yu Gothic UI", 12), 'bg': '#1976d2', 'fg': 'white', 'activebackground': '#1565c0', 'activeforeground': 'white', 'relief': 'flat', 'bd': 0, 'cursor': 'hand2'}

# Show/Hide symbols as popup
symbols_popup = None

def show_symbols_popup():
    global symbols_popup
    if symbols_popup is not None and tk.Toplevel.winfo_exists(symbols_popup):
        symbols_popup.lift()
        return
    symbols_popup = tk.Toplevel(root)
    symbols_popup.title('Calculation Symbols')
    symbols_popup.geometry('520x420')
    symbols_popup.configure(bg='#f7f7f7')
    label = tk.Label(symbols_popup, text=symbols_guide, font=("Consolas", 13), justify='left', anchor='w', bg='#f7f7f7')
    label.pack(pady=15, padx=15, anchor='w')
    hide_btn = tk.Button(symbols_popup, text='Close', command=symbols_popup.destroy, **button_style)
    hide_btn.pack(pady=10)
    symbols_popup.transient(root)
    symbols_popup.grab_set()

def hide_symbols_popup():
    global symbols_popup
    if symbols_popup is not None:
        symbols_popup.destroy()
        symbols_popup = None

# ここから親をmain_frameに変更
show_button = tk.Button(main_frame, text='記号対応表', command=show_symbols_popup, **button_style)
show_button.pack(pady=(18, 8), anchor='w', padx=24)

input_frame = tk.Frame(main_frame, bg='#e3eafc', padx=18, pady=14)
input_frame.pack(pady=12, fill='x', padx=24)
label_eq = tk.Label(input_frame, text='方程式（例: x**2 + 2*x + 1 = 0）:', font=("Yu Gothic UI", 13), bg='#e3eafc')
label_eq.grid(row=0, column=0, sticky='w')
add_eq_button = tk.Button(input_frame, text='追加', command=add_eq, **button_style, width=7)
add_eq_button.grid(row=0, column=1, padx=(10,0))
eq_frame = tk.Frame(input_frame, bg='#e3eafc')
eq_frame.grid(row=1, column=0, columnspan=2, sticky='w', padx=(10,0), pady=(8,0))

var_frame = tk.Frame(main_frame, bg='#e3eafc', padx=18, pady=14)
var_frame.pack(pady=12, fill='x', padx=24)
label_solve = tk.Label(var_frame, text='解く変数（例: x）:', font=("Yu Gothic UI", 13), bg='#e3eafc')
label_solve.grid(row=0, column=0, sticky='w')
add_solve_button = tk.Button(var_frame, text='追加', command=add_solve_var, **button_style, width=7)
add_solve_button.grid(row=0, column=1, padx=(10,0))
solve_vars_frame = tk.Frame(var_frame, bg='#e3eafc')
solve_vars_frame.grid(row=1, column=0, columnspan=2, sticky='w', padx=(10,0), pady=(8,0))

# 変数入力欄の下に「自動追加」ボタンを追加

def auto_add_solve_vars():
    eqs = get_all_eqs()
    symbol_names = list(extract_symbols_from_texts(eqs))
    # 既存の変数欄をクリア
    for frame, entry in solve_var_entries[:]:
        frame.destroy()
    solve_var_entries.clear()
    # 自動検出した変数ごとに欄を追加
    for var in symbol_names:
        frame = tk.Frame(solve_vars_frame, bg='#e3eafc')
        entry = tk.Entry(frame, width=20, font=("Yu Gothic UI", 13), bg='#fff', relief='solid', bd=1)
        entry.insert(0, var)
        entry.pack(side=tk.LEFT, padx=5, pady=6)
        def remove(f=frame, e=entry):
            solve_var_entries.remove((f, e))
            f.destroy()
        del_button = tk.Button(frame, text='削除', command=remove, font=("Yu Gothic UI", 11), bg='#d32f2f', fg='white', activebackground='#b71c1c', activeforeground='white', relief='flat', bd=0, width=5, cursor='hand2')
        del_button.pack(side=tk.LEFT, padx=4)
        frame.pack(anchor='w', pady=6, fill='x', padx=0)
        solve_var_entries.append((frame, entry))

# 変数入力欄の下にボタンを追加
auto_add_button = tk.Button(var_frame, text='自動追加', command=auto_add_solve_vars, **button_style, width=10)
auto_add_button.grid(row=2, column=0, columnspan=2, pady=(8,0), sticky='w')

result_label = tk.Label(main_frame, text='', font=("Yu Gothic UI", 13), bg='#f7f7f7', fg='#d9534f')
result_label.pack(pady=16)

# --- preprocess_equationをここに移動 ---
def preprocess_equation(eq_str, symbol_names):
    # 変数名リストを長い順にソート（例: xyz, xy, x）
    sorted_vars = sorted(symbol_names, key=len, reverse=True)
    # 係数と変数の間に * を補う（例: 2x → 2*x, 5y → 5*y）
    for var in sorted_vars:
        # 数字と変数の間
        eq_str = re.sub(rf'(\d)({var})(?![a-zA-Z0-9_])', r'\1*\2', eq_str)
        # 変数と変数の間（例: xy → x*y）
        eq_str = re.sub(rf'({var})(?={"|".join(sorted_vars)})', lambda m: m.group(1) + '*', eq_str)
    return eq_str
# --- preprocess_equationここまで ---

# --- solve_equationをここに移動 ---
def solve_equation():
    try:
        eqs = get_all_eqs()
        solve_vars = get_all_solve_var_names()
        if not eqs:
            result_label.config(text='Please enter at least one equation.')
            return
        # 求める変数が空なら自動検知
        if not solve_vars:
            # 方程式から変数名を抽出
            symbol_names = list(extract_symbols_from_texts(eqs))
            if not symbol_names:
                result_label.config(text='変数が検出できませんでした。')
                return
            solve_vars = symbol_names
        else:
            all_texts = eqs + solve_vars
            symbol_names = extract_symbols_from_texts(all_texts)
        if symbol_names:
            symbols(','.join(symbol_names))
        eq_list = []
        for eq_str in eqs:
            eq_str = preprocess_equation(eq_str, symbol_names)
            if '=' in eq_str:
                left, right = eq_str.split('=')
                left = sympify(left)
                right = sympify(right)
                eq = Eq(left, right)
            else:
                eq = sympify(eq_str)
            eq_list.append(eq)
        vars_symbols = [symbols(v) for v in solve_vars]
        solutions = solve(eq_list, vars_symbols, dict=True)
        display_lines = []
        if solutions:
            for i, sol in enumerate(solutions):
                label = f'Solution {i+1}: '
                formula = ", \\; ".join([f"{latex(k)} = {latex(v)}" for k, v in sol.items()])
                display_lines.append((label, f"${formula}$"))
        else:
            alt_solutions = solve(eq_list, vars_symbols, dict=False)
            if alt_solutions:
                if isinstance(alt_solutions, list):
                    for i, sol in enumerate(alt_solutions):
                        label = f'Algebraic solution {i+1}: '
                        if isinstance(sol, tuple):
                            formula = ", \\; ".join([latex(v) for v in sol])
                        else:
                            formula = latex(sol)
                        display_lines.append((label, f"${formula}$"))
                else:
                    display_lines.append(('Algebraic solution: ', f"${latex(alt_solutions)}$"))
            else:
                display_lines.append(('No solution was found.', ''))
        # matplotlib: English + LaTeX
        fig, ax = plt.subplots(figsize=(10, 1+len(display_lines)*0.7))
        ax.axis('off')
        for i, (label, formula) in enumerate(display_lines):
            y = 1 - (i+1)*0.18  # 1行分広げる
            ax.text(0.05, y, label, fontsize=15, ha='left', va='top', family='sans-serif')
            if formula:
                ax.text(0.08, y-0.08, formula, fontsize=16, ha='left', va='top')
        plt.show()
    except Exception as e:
        messagebox.showerror('Error', f'Input error: {e}')
# --- solve_equationここまで ---

solve_button = tk.Button(main_frame, text='解を求める', command=solve_equation, **button_style, width=14, height=2)
solve_button.pack(pady=22)

# 最初に1つ方程式欄を追加
add_eq()

root.mainloop()
