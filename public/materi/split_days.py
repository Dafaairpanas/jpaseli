"""
Script untuk memecah alldays.txt menjadi file per hari.
Setiap baris dimulai dengan nomor hari (kolom pertama, dipisah tab).
Script akan membaca file, mengelompokkan per nomor, dan menghasilkan file seperti 6.txt, 7.txt, dst.
"""

import os

INPUT_FILE = os.path.join(os.path.dirname(__file__), "alldays.txt")
OUTPUT_DIR = os.path.dirname(__file__)

def split_days():
    if not os.path.exists(INPUT_FILE):
        print(f"File '{INPUT_FILE}' tidak ditemukan!")
        return
    
    groups = {}
    
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip():
                continue
            
            # Kolom pertama adalah nomor hari
            day_num = line.split("\t")[0].strip()
            
            if not day_num.isdigit():
                continue
                continue
            
            if day_num not in groups:
                groups[day_num] = []
            groups[day_num].append(line)
    
    if not groups:
        print("Tidak ada data yang ditemukan.")
        return

    created_files = []
    for day_num in sorted(groups.keys(), key=int):
        output_path = os.path.join(OUTPUT_DIR, f"{day_num}.txt")
        with open(output_path, "w", encoding="utf-8") as out:
            out.write("\n".join(groups[day_num]) + "\n")
        created_files.append(f"{day_num}.txt ({len(groups[day_num])} baris)")
    
    print(f"\nBerhasil memecah {len(groups)} hari dari alldays.txt!")
    print("File yang dibuat:")
    for f_name in created_files:
        print(f"  * {f_name}")

if __name__ == "__main__":
    split_days()
