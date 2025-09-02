// components/PDFViewer.js
const { useState, useEffect } = React;

const PDFViewer = ({
    baseUrl = '',
    currentPage = null,
    minPage = 1,
    maxPage = 100,
    onPageChange,
    title = "📖 Documento PDF"
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const styles = {
        panel: {
            flex: 1,
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
        panelContent: {
            flex: 1,
            overflow: 'auto',
            position: 'relative'
        },
        pdfContainer: {
            width: '100%',
            height: '100%',
            position: 'relative',
            background: '#f8f9fa'
        },
        pdfFrame: {
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white'
        },
        noContent: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#7f8c8d',
            textAlign: 'center',
            padding: '40px'
        },
        loadingOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '16px',
            color: '#34495e',
            zIndex: 50
        },
        pdfNavigation: {
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(52, 73, 94, 0.9)',
            padding: '10px 15px',
            borderRadius: '25px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: 100
        },
        navButton: {
            background: '#3498db',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
        },
        navButtonDisabled: {
            background: '#95a5a6',
            cursor: 'not-allowed'
        },
        navButtonHover: {
            background: '#2980b9',
            transform: 'translateY(-2px)'
        },
        pageIndicator: {
            display: 'flex',
            alignItems: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            padding: '0 15px'
        },
        currentPageInfo: {
            fontSize: '12px',
            color: '#ecf0f1',
            marginLeft: '10px'
        }
    };

    const handleNavigation = (direction) => {
        if (currentPage === null) return;
        const newPage = currentPage + direction;
        if (newPage >= minPage && newPage <= maxPage) {
            if (onPageChange) {
                onPageChange(newPage);
            }
        }
    };

    const handleFrameLoad = () => {
        setIsLoading(false);
    };

    const handleFrameError = () => {
        setIsLoading(false);
        console.error('Errore nel caricamento del PDF');
    };

    const handleKeyDown = (e) => {
        if (currentPage !== null) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handleNavigation(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNavigation(1);
            }
        }
    };

    const handleButtonMouseEnter = (e, disabled) => {
        if (!disabled) {
            e.target.style.background = styles.navButtonHover.background;
            e.target.style.transform = styles.navButtonHover.transform;
        }
    };

    const handleButtonMouseLeave = (e, disabled) => {
        if (!disabled) {
            e.target.style.background = styles.navButton.background;
            e.target.style.transform = 'none';
        }
    };

    useEffect(() => {
        if (currentPage !== null) {
            setIsLoading(true);
        }
    }, [currentPage]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, minPage, maxPage]);

    const getPDFUrl = () => {
        if (currentPage === null) return '';
        const filename = `pdf/62443_3_2_${currentPage}.pdf`;
        const fullUrl = baseUrl ? `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}${filename}` : filename;
        return `${fullUrl}?t=${new Date().getTime()}`;
    };

    const getCurrentFilename = () => {
        return currentPage !== null ? `pdf/62443_3_2_${currentPage}.pdf` : 'Seleziona un articolo';
    };

    const isPrevDisabled = currentPage <= minPage;
    const isNextDisabled = currentPage >= maxPage;

    return (
        <div style={styles.panel}>
            <div style={styles.panelHeader}>
                {title}
                <span style={styles.currentPageInfo}>
                    {getCurrentFilename()}
                </span>
            </div>
            
            <div style={styles.panelContent}>
                {currentPage === null ? (
                    <div style={styles.noContent}>
                        <h3>👈 Seleziona un articolo</h3>
                        <p>Clicca su un articolo nella lista a sinistra per visualizzare il PDF corrispondente.</p>
                        <p><em>I PDF vanno dalla pagina {minPage} alla pagina {maxPage}</em></p>
                    </div>
                ) : (
                    <div style={styles.pdfContainer}>
                        {isLoading && (
                            <div style={styles.loadingOverlay}>
                                ⏳ Caricamento PDF...
                            </div>
                        )}
                        <iframe
                            style={styles.pdfFrame}
                            src={getPDFUrl()}
                            title="Documento PDF"
                            onLoad={handleFrameLoad}
                            onError={handleFrameError}
                        />
                        <div style={styles.pdfNavigation}>
                            <button
                                style={{
                                    ...styles.navButton,
                                    ...(isPrevDisabled ? styles.navButtonDisabled : {})
                                }}
                                disabled={isPrevDisabled}
                                onClick={() => handleNavigation(-1)}
                                onMouseEnter={(e) => handleButtonMouseEnter(e, isPrevDisabled)}
                                onMouseLeave={(e) => handleButtonMouseLeave(e, isPrevDisabled)}
                            >
                                ◀ Precedente
                            </button>
                            <div style={styles.pageIndicator}>
                                Pagina {currentPage}
                            </div>
                            <button
                                style={{
                                    ...styles.navButton,
                                    ...(isNextDisabled ? styles.navButtonDisabled : {})
                                }}
                                disabled={isNextDisabled}
                                onClick={() => handleNavigation(1)}
                                onMouseEnter={(e) => handleButtonMouseEnter(e, isNextDisabled)}
                                onMouseLeave={(e) => handleButtonMouseLeave(e, isNextDisabled)}
                            >
                                Successiva ▶
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Rende il componente disponibile globalmente
window.PDFViewer = PDFViewer;