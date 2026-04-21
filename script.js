document.addEventListener('DOMContentLoaded', async () => {
    const lessonList = document.getElementById('lesson-list');
    const lessonContainer = document.getElementById('lesson-container');
    const welcomeMessage = document.getElementById('welcome-message');
    const mdContent = document.getElementById('md-content');
    
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('open-sidebar');
    const closeBtn = document.getElementById('close-sidebar');

    // Gestion du menu mobile
    openBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('mobile-open');
        } else {
            sidebar.classList.remove('collapsed');
        }
    });

    closeBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
        } else {
            sidebar.classList.add('collapsed');
        }
    });

    // Fermer le menu si on clique à côté sur mobile
    document.querySelector('.content').addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && e.target !== openBtn) {
            sidebar.classList.remove('mobile-open');
        }
    });

    // Charger la liste des leçons
    async function initCatalog() {
        try {
            const response = await fetch('lessons.json');
            if (!response.ok) throw new Error("Impossible de charger le catalogue");
            const lessons = await response.json();
            
            lessonList.innerHTML = '';
            
            lessons.forEach((lesson, index) => {
                const li = document.createElement('li');
                li.textContent = lesson.title;
                li.setAttribute('data-file', lesson.path);
                
                // Charger la première leçon automatiquement (optionnel)
                // if (index === 0) {
                //     li.classList.add('active');
                //     loadLesson(lesson.path);
                // }
                
                lessonList.appendChild(li);
            });
        } catch (error) {
            console.error(error);
            lessonList.innerHTML = '<li style="color:red">Erreur : Catalogue introuvable</li>';
        }
    }

    // Gérer le clic sur une leçon
    lessonList.addEventListener('click', async (e) => {
        const li = e.target.closest('li');
        if (!li) return;

        document.querySelectorAll('#lesson-list li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
        }

        const filepath = li.getAttribute('data-file'); 
        await loadLesson(filepath); 
    });

    // Charger et afficher le fichier Markdown
    async function loadLesson(filepath) {
        try {
            const response = await fetch(filepath);
            if (!response.ok) throw new Error(`Fichier introuvable : ${filepath}`);
            let markdown = await response.text();
            
            // Trouver le dossier du fichier pour les chemins relatifs des images
            const folder = filepath.substring(0, filepath.lastIndexOf('/'));
            
            // Remplacer les chemins relatifs dans le html brut (au cas où il y a des balises <img>)
            markdown = markdown.replace(/src=["']([^http].*?)["']/g, (match, srcPath) => {
                return `src="${folder}/${encodeURI(srcPath)}"`;
            });
            
            configureMarked(folder);
            
            // Injecter le HTML généré
            mdContent.innerHTML = marked.parse(markdown);
            organizeLayout();
            
            welcomeMessage.classList.add('hidden');
            lessonContainer.classList.remove('hidden');
            
            // Remonter en haut de la page à chaque nouvelle leçon
            document.querySelector('.content').scrollTo(0, 0);
            
        } catch (error) {
            console.error(error);
            lessonContainer.innerHTML = `<div style="color:red; padding: 20px;">Erreur : Impossible de charger le fichier <b>${filepath}</b>.</div>`;
        }
    }

    // Fonction qui capture l'image et le tableau pour les mettre côte à côte
    function organizeLayout() {
        const content = document.getElementById('md-content');
        
        // On cherche la première image, le titre "Vocabulaire", et le premier tableau
        const imageWrapper = content.querySelector('.custom-image-wrapper');
        const vocabHeader = Array.from(content.querySelectorAll('h2')).find(h => h.textContent.includes('Vocabulaire'));
        const table = content.querySelector('table');
        
        // Si la page contient bien une image et un tableau, on les met en grille
        if (imageWrapper && table) {
            const flexContainer = document.createElement('div');
            flexContainer.className = 'lesson-header-layout';
            
            // On insère notre nouvelle structure juste à l'endroit où était l'image
            imageWrapper.parentNode.insertBefore(flexContainer, imageWrapper);
            
            // Colonne de gauche (Image)
            const leftCol = document.createElement('div');
            leftCol.className = 'layout-left';
            leftCol.appendChild(imageWrapper);
            
            // Colonne de droite (Titre + Tableau)
            const rightCol = document.createElement('div');
            rightCol.className = 'layout-right';
            if (vocabHeader) rightCol.appendChild(vocabHeader);
            rightCol.appendChild(table);
            
            // On assemble le tout
            flexContainer.appendChild(leftCol);
            flexContainer.appendChild(rightCol);
        }
    }

    // Configurer le moteur Markdown pour de belles images
    function configureMarked(folder) {
        const renderer = new marked.Renderer();
        
        // Surcharge de l'affichage des images Markdown
        renderer.image = function(token_or_href, title, text) {
            // Marked v13+ passe un objet token unique, les anciennes versions passent des arguments séparés
            const isToken = typeof token_or_href === 'object' && token_or_href !== null;
            const href = isToken ? token_or_href.href : token_or_href;
            const altText = isToken ? token_or_href.text : text;
            
            // Sécurité si l'image n'a pas de lien
            if (!href) return '';

            // Gestion du chemin (absolu vs relatif)
            const newHref = href.startsWith('http') ? href : `${folder}/${encodeURI(href)}`;
            
            return `
            <figure class="custom-image-wrapper">
                <img src="${newHref}" alt="${altText || ''}" loading="lazy">
                ${altText ? `<figcaption>${altText}</figcaption>` : ''}
            </figure>`;
        };
        
        marked.setOptions({ 
            renderer: renderer,
            gfm: true, // Supporte les tableaux et les cases à cocher
            breaks: true // Respecte les sauts de ligne simples
        });
    }
    initCatalog();

});