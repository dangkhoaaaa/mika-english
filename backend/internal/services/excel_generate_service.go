package services

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/xuri/excelize/v2"
)

// ExcelGenerateRow — một dòng từ vựng (5 cột giống mẫu: VOCABULARY, POS, CLASS, MEANING, EXAMPLE).
type ExcelGenerateRow struct {
	Vocabulary string `json:"vocabulary"`
	POS        string `json:"pos"`
	Class      string `json:"class"`
	Meaning    string `json:"meaning"`
	Example    string `json:"example"`
}

// ExcelGenerateSheet — một sheet (chủ đề) + các dòng.
type ExcelGenerateSheet struct {
	Name string             `json:"name"`
	Rows []ExcelGenerateRow `json:"rows"`
}

// ExcelGenerateRequest — body tạo file .xlsx (nhiều sheet).
type ExcelGenerateRequest struct {
	FileName string               `json:"fileName"`
	Sheets   []ExcelGenerateSheet `json:"sheets"`
}

const (
	maxSheets     = 40
	maxRowsPer    = 5000
	maxTotalRows  = 20000
	maxSheetName  = 31
	maxFileName   = 120
)

var invalidSheetChars = regexp.MustCompile(`[\[\]\*\?/\\\:]`)

func sanitizeSheetName(name string) string {
	s := strings.TrimSpace(name)
	s = invalidSheetChars.ReplaceAllString(s, " ")
	s = strings.TrimSpace(s)
	if s == "" {
		s = "Topic"
	}
	if utf8.RuneCountInString(s) > maxSheetName {
		s = string([]rune(s)[:maxSheetName])
	}
	return s
}

func sanitizeDownloadFileName(name string) string {
	base := strings.TrimSpace(name)
	if base == "" {
		return "vocabulary.xlsx"
	}
	base = filepath.Base(base)
	base = strings.ReplaceAll(base, "\x00", "")
	if !strings.HasSuffix(strings.ToLower(base), ".xlsx") {
		base += ".xlsx"
	}
	if utf8.RuneCountInString(base) > maxFileName {
		base = string([]rune(base)[:maxFileName])
	}
	return base
}

// BuildVocabularyExcel tạo buffer .xlsx: mỗi sheet một chủ đề, hàng 1 là header chuẩn.
func BuildVocabularyExcel(req ExcelGenerateRequest) ([]byte, string, error) {
	if len(req.Sheets) == 0 {
		return nil, "", fmt.Errorf("sheets rỗng")
	}
	if len(req.Sheets) > maxSheets {
		return nil, "", fmt.Errorf("quá nhiều sheet (tối đa %d)", maxSheets)
	}

	total := 0
	for _, sh := range req.Sheets {
		n := len(sh.Rows)
		if n > maxRowsPer {
			return nil, "", fmt.Errorf("sheet %q quá nhiều dòng (tối đa %d)", sh.Name, maxRowsPer)
		}
		total += n
	}
	if total > maxTotalRows {
		return nil, "", fmt.Errorf("tổng số dòng vượt %d", maxTotalRows)
	}

	f := excelize.NewFile()
	defer func() { _ = f.Close() }()

	defaultName := f.GetSheetName(0)
	headers := []string{"VOCABULARY", "POS", "CLASS", "MEANING", "EXAMPLE"}
	usedNames := map[string]struct{}{}

	uniqueSheetName := func(raw string) string {
		base := sanitizeSheetName(raw)
		name := base
		n := 2
		for {
			if _, dup := usedNames[name]; !dup {
				usedNames[name] = struct{}{}
				return name
			}
			suffix := fmt.Sprintf("_%d", n)
			n++
			maxBase := maxSheetName - utf8.RuneCountInString(suffix)
			if maxBase < 1 {
				maxBase = 1
			}
			r := []rune(base)
			if len(r) > maxBase {
				base = string(r[:maxBase])
			}
			name = base + suffix
			if utf8.RuneCountInString(name) > maxSheetName {
				name = string([]rune(name)[:maxSheetName])
			}
		}
	}

	for i, sh := range req.Sheets {
		sheetName := uniqueSheetName(sh.Name)
		if i == 0 {
			if err := f.SetSheetName(defaultName, sheetName); err != nil {
				return nil, "", err
			}
		} else {
			idx, err := f.NewSheet(sheetName)
			if err != nil {
				return nil, "", err
			}
			f.SetActiveSheet(idx)
		}

		for c, h := range headers {
			cell, _ := excelize.CoordinatesToCellName(c+1, 1)
			if err := f.SetCellValue(sheetName, cell, h); err != nil {
				return nil, "", err
			}
		}

		for ri, row := range sh.Rows {
			r := ri + 2
			vals := []string{
				strings.TrimSpace(row.Vocabulary),
				strings.TrimSpace(row.POS),
				strings.TrimSpace(row.Class),
				strings.TrimSpace(row.Meaning),
				strings.TrimSpace(row.Example),
			}
			for c, v := range vals {
				cell, _ := excelize.CoordinatesToCellName(c+1, r)
				if err := f.SetCellValue(sheetName, cell, v); err != nil {
					return nil, "", err
				}
			}
		}
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}
	out := buf.Bytes()
	if len(out) == 0 {
		return nil, "", fmt.Errorf("file rỗng")
	}
	fname := sanitizeDownloadFileName(req.FileName)
	return out, fname, nil
}
