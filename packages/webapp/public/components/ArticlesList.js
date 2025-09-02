// components/ArticlesList.js
const { useState, useEffect } = React;

const ArticlesList = ({ 
    articles = [], 
    onArticleSelect, 
    currentPage = null,
    searchPlaceholder = "🔍 Cerca articoli...",
    title = "📋 Lista Articoli"
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredArticles, setFilteredArticles] = useState(articles);

    useEffect(() => {
        const filtered = articles.filter(article =>
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.articleNumber.toString().includes(searchTerm) ||
            article.pageNumber.toString().includes(searchTerm)
        );
        setFilteredArticles(filtered);
    }, [articles, searchTerm]);

    const styles = {
        panel: {
            width: '350px',
            minWidth: '300px',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minWidth: 0
        },
        panelHeader: {
            background: '#34495e',
            color: 'white',
            padding: '12px 20px',
            fontWeight: '600',
            fontSize: '14px',
            borderBottom: '1px solid #2c3e50',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        searchBox: {
            padding: '15px 20px',
            borderBottom: '1px solid #ecf0f1',
            background: '#f8f9fa'
        },
        searchInput: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #bdc3c7',
            borderRadius: '5px',
            fontSize: '14px',
            background: 'white',
            outline: 'none'
        },
        panelContent: {
            flex: 1,
            overflow: 'auto',
            position: 'relative'
        },
        articlesList: {
            padding: 0,
            margin: 0,
            listStyle: 'none'
        },
        articleItem: {
            borderBottom: '1px solid #ecf0f1',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
        },
        articleItemActive: {
            background: '#3498db',
            color: 'white'
        },
        articleItemHover: {
            background: '#f8f9fa'
        },
        articleItemActiveHover: {
            background: '#2980b9'
        },
        articleLink: {
            display: 'block',
            padding: '15px 20px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 0.2s ease'
        },
        articleNumber: {
            fontWeight: '700',
            fontSize: '14px',
            color: '#3498db',
            marginBottom: '5px'
        },
        articleNumberActive: {
            color: 'white'
        },
        articleTitle: {
            fontSize: '15px',
            lineHeight: '1.4',
            wordWrap: 'break-word',
            marginBottom: '8px'
        },
        pageInfo: {
            fontSize: '13px',
            color: '#7f8c8d',
            fontStyle: 'italic'
        },
        pageInfoActive: {
            color: '#ecf0f1'
        },
        statusIndicator: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#27ae60',
            marginRight: '8px'
        },
        articleCount: {
            fontSize: '12px',
            color: '#7f8c8d'
        },
        noContent: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            color: '#7f8c8d',
            textAlign: 'center',
            padding: '40px'
        }
    };

    const handleArticleClick = (pageNumber) => {
        if (onArticleSelect) {
            onArticleSelect(pageNumber);
        }
    };

    const handleMouseEnter = (e, isActive) => {
        if (isActive) {
            e.target.closest('.article-item').style.background = styles.articleItemActiveHover.background;
        } else {
            e.target.closest('.article-item').style.background = styles.articleItemHover.background;
        }
    };

    const handleMouseLeave = (e, isActive) => {
        if (isActive) {
            e.target.closest('.article-item').style.background = styles.articleItemActive.background;
        } else {
            e.target.closest('.article-item').style.background = 'white';
        }
    };

    return (
        <div style={styles.panel}>
            <div style={styles.panelHeader}>
                {title}
                <div style={{display: 'flex', alignItems: 'center'}}>
                    <div style={styles.statusIndicator}></div>
                    <span style={styles.articleCount}>
                        {filteredArticles.length} {filteredArticles.length === 1 ? 'articolo' : 'articoli'}
                    </span>
                </div>
            </div>
            
            <div style={styles.searchBox}>
                <input
                    type="text"
                    style={styles.searchInput}
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div style={styles.panelContent}>
                <ul style={styles.articlesList}>
                    {filteredArticles.length === 0 ? (
                        <li style={styles.noContent}>
                            <h3>Nessun articolo trovato</h3>
                            <p>Prova a modificare i criteri di ricerca.</p>
                        </li>
                    ) : (
                        filteredArticles.map((article) => {
                            const isActive = currentPage === article.pageNumber;
                            return (
                                <li
                                    key={article.pageNumber}
                                    className="article-item"
                                    style={{
                                        ...styles.articleItem,
                                        ...(isActive ? styles.articleItemActive : {})
                                    }}
                                    onClick={() => handleArticleClick(article.pageNumber)}
                                    onMouseEnter={(e) => handleMouseEnter(e, isActive)}
                                    onMouseLeave={(e) => handleMouseLeave(e, isActive)}
                                >
                                    <div style={styles.articleLink}>
                                        <div style={{
                                            ...styles.articleNumber,
                                            ...(isActive ? styles.articleNumberActive : {})
                                        }}>
                                            Articolo {article.articleNumber}
                                        </div>
                                        <div style={styles.articleTitle}>
                                            {article.title}
                                        </div>
                                        <div style={{
                                            ...styles.pageInfo,
                                            ...(isActive ? styles.pageInfoActive : {})
                                        }}>
                                            📄 Pagina {article.pageNumber} • pdf/62443_3_2_{article.pageNumber}.pdf
                                        </div>
                                    </div>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>
        </div>
    );
};

// Rende il componente disponibile globalmente
window.ArticlesList = ArticlesList;