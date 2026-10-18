# Flight Watch 開發環境設定指南

照著下面四個步驟做，大約 30 分鐘就能開始一起開發 Flight Watch（機票比價追蹤 App）。**不需要在電腦上安裝任何軟體**，全部在瀏覽器裡完成。

建議用電腦（Chrome 或 Safari）操作，手機上畫面太小，不好看程式和預覽。

## 步驟一：註冊 GitHub 帳號

GitHub 是放程式碼的地方，我們兩個人的工作都在這裡合併。

1. 到 [github.com](https://github.com) 免費註冊。使用者名稱建議用英文、好認的名字。
2. 開啟**兩步驟驗證**（Settings → Password and authentication），用手機驗證 App。
3. 把你的 GitHub 使用者名稱傳給我，我會把你加進 `flight-watch` 專案。
4. 你會收到一封邀請信，點 **Accept invitation** 接受。

## 步驟二：加入 Claude 團隊帳號

我會從公司的 Claude Team 方案分一個席位給你，你**不用自己付費**。每個席位都包含 Claude Code。

1. 把你想用的 Email 告訴我，我會從 Claude 管理後台發邀請。
2. 收到邀請信後，用**同一個 Email** 登入 [claude.ai](https://claude.ai) 並接受邀請。
3. 如果你本來就有個人的 Claude 帳號，登入後要確認左下角帳號選單選的是**團隊**，不是個人帳號。這個專案的工作都在團隊裡做。

每個人的用量是分開計算的，你用完不會影響到我。如果遇到「已達用量上限」，跟我說一聲，等額度重置或由我調整。

## 步驟三：在 Claude Code 開啟專案

Claude Code 是幫我們寫程式的 AI。我們用網頁版，它在雲端執行，所以電腦不用裝東西。

1. 到 [claude.ai/code](https://claude.ai/code)（確認是團隊帳號）。
2. 照畫面提示**連結 GitHub**，授權時要包含 `flight-watch` 這個專案。
3. 選 `flight-watch`，開一個新的工作（session）。
4. 測試一下，輸入：

```
請閱讀 SPEC.md、CLAUDE.md 和 docs/design-summary.md，用中文告訴我這個 App 在做什麼、現在做到哪一個階段。先不要修改任何檔案。
```

如果它回答得出來，就代表設定成功了。

## 步驟四：看規格書和設計稿

開始動手前，先花 20 分鐘了解我們要做什麼。

- **docs/design-summary.md**：中英對照的設計摘要，先看這份。
- **SPEC.md**（專案根目錄）：完整功能、資料結構、開發階段。英文看不懂的地方，可以請 Claude Code 翻譯或解釋。
- **設計稿**：我會另外分享連結，也可以在 `docs/mockup/` 看檔案。

你的第一個正式任務會是「我的旅程」頁面，可以先特別看一下那一組設計稿。

## 現在不需要準備的東西

下面這些你可能會在 SPEC.md 裡看到，但**現在都不用申請或安裝**：

- **Supabase**（資料庫）、**Netlify**（網站主機）：我管理，你不用登入。
- **Ignav、SerpApi、Resend 的 API 金鑰**：開發時用「假資料」模式（`PRICE_PROVIDER=mock`），不需要金鑰。
- **VS Code、Node.js、Docker**：只有想在自己電腦上執行 App 時才需要，之後再說。

## 五個常用名詞

| 名詞 | 白話解釋 |
| --- | --- |
| Repo（專案庫） | 專案資料夾，放在 GitHub 上。 |
| Branch（分支） | 你自己的工作副本。改壞了也不會影響主版本 `main`。 |
| Pull Request（PR） | 「這是我的修改，請幫我看一下再放進去。」 |
| Merge（合併） | 把 PR 放進主版本。前幾週由我來按。 |
| Deploy preview（預覽網址） | 每個 PR 都會有一個暫時的網站，可以點進去實際操作看看。 |

## 安全規則

- **不要**把密碼或 API 金鑰貼給 Claude，也不要寫進程式裡。
- **不要**直接改 `main`。永遠在自己的 branch 上工作，再開 PR。
- Claude 問你要不要「刪除」或「重設」什麼東西，而你不確定意思時，**先停下來問我**。
- 不確定怎麼選的問題（例如技術選擇），也先問我再回答 Claude。

## 完成檢查清單

- [ ] GitHub 帳號已註冊，兩步驟驗證已開啟
- [ ] 已接受 `flight-watch` 專案邀請
- [ ] 已接受 Claude 團隊邀請，登入的是團隊帳號
- [ ] Claude Code 已連結 GitHub，能開啟 `flight-watch`
- [ ] 測試問題有得到回答
- [ ] 看過設計摘要、SPEC.md 和設計稿

全部打勾後跟我說，我們約一個小時線上一起做第一個小修改。
