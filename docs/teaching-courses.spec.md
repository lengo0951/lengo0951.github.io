# Spec: Teaching Courses Section

**Status:** ready for implementation  
**Target:** `lengo0951.github.io/index.html`

## Goal

Add a concise **Teaching** section to Phan The Duy's personal website. The
section presents the courses he teaches at VNUHCM-UIT, following the simple
course-list style of the referenced academic homepage.

## Content requirements

- Show the section heading as `Teaching`.
- Include a `Courses taught` subheading or equivalent introductory label.
- List every course below exactly once, showing its code and Vietnamese course
  name.
- Do not add credit counts, semesters, course descriptions, links, or inferred
  teaching dates.
- Keep the list in the order specified below.

| Code | Course name |
| --- | --- |
| NT521 | Lập trình an toàn và khai thác lỗ hổng phần mềm |
| NT522 | Phương pháp học máy trong an toàn thông tin |
| NT230 | Cơ chế hoạt động của mã độc |
| NT2207 | Pháp chứng số trên máy tính và mạng |
| NT2202 | Cơ chế hoạt động mã độc nâng cao |
| IE105 | Nhập môn bảo đảm và an ninh thông tin |

## Presentation requirements

- Use the existing semantic section and list styles so the content matches the
  rest of the static site in both light and dark themes.
- Place the section among the primary biography/academic content, before the
  publications section.
- Format each entry as `CODE — Course name`; keep course codes visually
  distinguishable, for example with existing bold styling.
- Add a matching `Teaching` navigation link only if the site's navigation is
  intended to expose each primary section. Otherwise, do not change navigation.

## Acceptance criteria

- The rendered page has one visible Teaching section.
- It contains exactly six course entries and all codes/names match this spec.
- No course-credit, semester, or unverified schedule data is displayed.
- The page remains responsive and visually consistent with the existing site.

## Source verification

- `NT521`, `NT522`, and `IE105` are verified from UIT's course catalogue
  supplied for this task.
- `NT230` is verified as **Cơ chế hoạt động của mã độc** in UIT's undergraduate
  Information Security curriculum and teaching notice for Phan The Duy.
- `NT2202` and `NT2207` are verified as the corresponding master's Information
  Security courses in UIT's published curriculum.
