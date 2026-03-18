import json
import pandas as pd
from datetime import datetime

def generate_excel():
    # Load the data
    with open('src/data/schedule.json', 'r', encoding='utf-8') as f:
        schedule_data = json.load(f)

    # Parse data into lists of dictionaries
    all_rows = []
    exam_rows = []
    study_rows = []
    
    # Track the last active chapter per subject to provide context for 'Revision' blocks
    last_chapter = {}

    for day in schedule_data:
        date = day.get('date', '')
        day_type = day.get('dayType', '')
        
        try:
            dt = datetime.strptime(date, "%Y-%m-%d")
            weekday = dt.strftime("%A")
        except:
            weekday = ""

        subjects = day.get('subjects', [])
        
        if not subjects:
             continue
             
        for subj in subjects:
            subject_name = subj.get('subject', '')
            chapter = subj.get('chapterName', '')
            
            # Keep track of the actual chapter being taught
            if chapter and chapter.lower() != 'revision':
                last_chapter[subject_name] = chapter
                
            # If it's a generic 'Revision', enrich it with the active chapter name we tracked
            if chapter.lower() == 'revision' and subject_name in last_chapter:
                chapter = f"Revision ({last_chapter[subject_name]})"
            
            row = {
                'Date (Kobe)': date,
                'Day': weekday,
                'Type': day_type,
                'Subject (Kon Subject)': subject_name,
                'Chapter': chapter,
                'Topic (Details)': subj.get('topic', ''),
                'Format': subj.get('type', 'N/A'),
                'Time': subj.get('unlockTime', '')
            }
            all_rows.append(row)
            
            if day_type in ['WEEKLY_TEST', 'CHAPTER_EXAM']:
                exam_rows.append(row)
            else:
                study_rows.append(row)

    # Create DataFrames
    df_all = pd.DataFrame(all_rows)
    df_exams = pd.DataFrame(exam_rows)
    df_study = pd.DataFrame(study_rows)

    excel_path = 'Study_Plan_Detailed_v2.xlsx'
    
    # Write to Excel
    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        df_all.to_excel(writer, index=False, sheet_name='All Details')
        df_study.to_excel(writer, index=False, sheet_name='Class & Study Plan')
        df_exams.to_excel(writer, index=False, sheet_name='Exam Schedule')
        
        # Access the openpyxl workbook and sheets to adjust column widths
        workbook = writer.book
        for sheet_name in workbook.sheetnames:
            worksheet = workbook[sheet_name]
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter # Get the column name
                for cell in col:
                    try: 
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = (max_length + 2)
                worksheet.column_dimensions[column].width = adjusted_width

    print(f"Excel sheet successfully created: {excel_path}")

if __name__ == '__main__':
    generate_excel()
