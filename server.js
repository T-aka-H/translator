const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // HTMLファイルを配置するディレクトリ

// Gemini API設定
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// 翻訳API エンドポイント
app.post('/api/translate', async (req, res) => {
    try {
        const { prompt, max_tokens = 1500 } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'プロンプトが必要です' });
        }
        
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Gemini API Keyが設定されていません' });
        }
        
        console.log('翻訳リクエスト開始');
        
        // Gemini APIへのリクエスト
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: max_tokens,
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                }
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini APIエラー:', response.status, errorText);
            return res.status(500).json({ 
                error: `Gemini API Error: ${response.status}` 
            });
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Gemini API 予期しないレスポンス:', data);
            return res.status(500).json({ 
                error: '翻訳の生成に失敗しました' 
            });
        }
        
        const translationResult = data.candidates[0].content.parts[0].text;
        
        console.log('翻訳リクエスト完了');
        
        res.json({
            response: translationResult,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('翻訳API エラー:', error);
        res.status(500).json({ 
            error: 'サーバーエラーが発生しました: ' + error.message 
        });
    }
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: '日本語→英語翻訳API'
    });
});

// ルートページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404ハンドラー
app.use('*', (req, res) => {
    res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

// エラーハンドラー
app.use((error, req, res, next) => {
    console.error('サーバーエラー:', error);
    res.status(500).json({ 
        error: 'サーバー内部エラーが発生しました' 
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 翻訳アプリサーバーがポート ${PORT} で起動しました`);
    console.log(`📝 API エンドポイント: http://localhost:${PORT}/api/translate`);
    console.log(`💊 ヘルスチェック: http://localhost:${PORT}/api/health`);
    
    if (!GEMINI_API_KEY) {
        console.warn('⚠️  警告: GEMINI_API_KEY 環境変数が設定されていません');
    } else {
        console.log('✅ Gemini API Key が設定されています');
    }
});

module.exports = app;