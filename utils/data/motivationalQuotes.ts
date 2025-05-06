import { SupportedLanguage } from '../i18n';

export type MotivationCategory = 
  | 'sport' 
  | 'business' 
  | 'studies' 
  | 'wellbeing' 
  | 'parenting' 
  | 'personalDevelopment' 
  | 'financialManagement';

type QuotesByLanguage = {
  [key in SupportedLanguage]?: string[];
};

type MotivationalQuotes = {
  [key in MotivationCategory]: QuotesByLanguage;
};

export const motivationalQuotes: MotivationalQuotes = {
  sport: {
    fr: [
      "Chaque entraînement te rapproche de ton objectif.",
      "La douleur d'aujourd'hui est la force de demain.",
      "Repousse tes limites, dépasse-toi.",
      "Le succès est la somme de petits efforts répétés.",
      "Visualise la victoire, puis travaille pour l'atteindre.",
      "Chaque goutte de sueur te rend plus fort.",
      "Transforme tes échecs en motivations.",
      "La discipline est le pont entre les objectifs et les réalisations.",
      "Ton corps peut supporter presque tout ; c'est ton esprit que tu dois convaincre.",
      "Ne rêve pas de gagner, entraîne-toi pour y parvenir.",
      "La persévérance transforme l'impossible en possible.",
      "Les champions sont faits de quelque chose qui brille de l'intérieur.",
      "Ta seule compétition est la personne que tu étais hier.",
      "Le corps atteint ce que l'esprit croit.",
      "L'excellence n'est pas un acte, mais une habitude.",
      "Ta force est dans ta détermination, pas dans tes excuses.",
      "Le sport forge le caractère et révèle le tien.",
      "Ce n'est pas le nombre de respirations que tu prends qui compte, mais les moments qui te coupent le souffle.",
      "La motivation t'amène au gymnase, l'habitude t'y maintient.",
      "Sois fort quand tu es faible, brave quand tu as peur, et humble quand tu es victorieux."
    ],
    en: [
      "Every workout brings you closer to your goal.",
      "Today's pain is tomorrow's strength.",
      "Push your limits, exceed yourself.",
      "Success is the sum of small efforts repeated daily.",
      "Visualize victory, then work to achieve it.",
      "Every drop of sweat makes you stronger.",
      "Transform your failures into motivation.",
      "Discipline is the bridge between goals and accomplishments.",
      "Your body can handle almost anything; it's your mind you have to convince.",
      "Don't dream of winning, train for it.",
      "Perseverance transforms the impossible into possible.",
      "Champions are made from something they have deep inside them that shines through.",
      "Your only competition is the person you were yesterday.",
      "The body achieves what the mind believes.",
      "Excellence is not an act but a habit.",
      "Your strength is in your determination, not in your excuses.",
      "Sports build character and reveal it.",
      "It's not about the number of breaths you take, but the moments that take your breath away.",
      "Motivation gets you to the gym, habit keeps you there.",
      "Be strong when you are weak, brave when you are scared, and humble when you are victorious."
    ]
  },
  business: {
    fr: [
      "Les opportunités ne se produisent pas, vous les créez.",
      "Ne rêvez pas de succès, travaillez pour.",
      "L'innovation distingue les leaders des suiveurs.",
      "Votre travail va remplir une grande partie de votre vie, faites en sorte qu'il soit passionnant.",
      "Le succès en affaires nécessite formation, discipline et travail acharné.",
      "Ne soyez pas effrayé d'abandonner le bon pour aller vers le grand.",
      "Le succès n'est pas la clé du bonheur. Le bonheur est la clé du succès.",
      "Faites ce que vous aimez et le succès suivra.",
      "Le secret du succès est de savoir quelque chose que personne d'autre ne sait.",
      "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.",
      "Les grandes réalisations sont toujours précédées par de grandes pensées.",
      "La persistance est la route la plus courte vers le succès.",
      "N'attendez pas l'opportunité parfaite, créez-la.",
      "Les défis d'aujourd'hui sont les opportunités de demain.",
      "La vraie richesse est de faire ce que vous aimez avec passion.",
      "Chaque client satisfait raconte votre histoire à trois autres.",
      "L'échec est simplement l'opportunité de recommencer de façon plus intelligente.",
      "Votre réseau détermine votre valeur nette.",
      "Le leadership consiste à faire ressortir le meilleur des autres.",
      "La qualité n'est jamais un accident, c'est toujours le résultat d'un effort intelligent."
    ],
    en: [
      "Opportunities don't happen, you create them.",
      "Don't dream of success, work for it.",
      "Innovation distinguishes between a leader and a follower.",
      "Your work is going to fill a large part of your life, make sure it's something you're passionate about.",
      "Success in business requires training, discipline, and hard work.",
      "Don't be afraid to give up the good to go for the great.",
      "Success is not the key to happiness. Happiness is the key to success.",
      "Do what you love and success will follow.",
      "The secret of success is to know something nobody else knows.",
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      "Great achievements are always preceded by great thoughts.",
      "Persistence is the shortest route to success.",
      "Don't wait for the perfect opportunity, create it.",
      "Today's challenges are tomorrow's opportunities.",
      "True wealth is doing what you love with passion.",
      "Every satisfied customer tells your story to three others.",
      "Failure is simply the opportunity to begin again, this time more intelligently.",
      "Your network determines your net worth.",
      "Leadership is about making others better as a result of your presence.",
      "Quality is never an accident; it is always the result of intelligent effort."
    ]
  },
  studies: {
    fr: [
      "L'éducation est l'arme la plus puissante pour changer le monde.",
      "Apprends comme si tu devais vivre pour toujours.",
      "La connaissance est le pouvoir.",
      "L'apprentissage est un trésor qui suivra son propriétaire partout.",
      "L'éducation coûte cher, mais l'ignorance coûte encore plus.",
      "Le savoir est la seule richesse qui s'accroît lorsqu'on la partage.",
      "Étudier, c'est s'améliorer soi-même.",
      "La persévérance est la clé de la réussite académique.",
      "Chaque jour d'étude te rapproche de ton objectif.",
      "Investis dans ton esprit, c'est le seul bien qui ne peut être volé.",
      "L'étude est la nourriture de l'esprit.",
      "Les difficultés d'aujourd'hui développent les forces de demain.",
      "La connaissance est le meilleur investissement que tu puisses faire.",
      "Chaque heure d'étude est une marche vers ton avenir.",
      "N'abandonne jamais quelque chose qui te tient à cœur à cause de sa difficulté.",
      "Ton attitude détermine ta direction.",
      "L'éducation est le passeport pour l'avenir.",
      "L'apprentissage est un voyage qui dure toute une vie.",
      "Ce n'est pas ce que tu sais, mais ce que tu fais avec ce que tu sais qui compte.",
      "Un esprit qui s'ouvre à une nouvelle idée ne revient jamais à sa taille d'origine."
    ],
    en: [
      "Education is the most powerful weapon to change the world.",
      "Learn as if you were to live forever.",
      "Knowledge is power.",
      "Learning is a treasure that will follow its owner everywhere.",
      "Education is expensive, but ignorance costs even more.",
      "Knowledge is the only wealth that increases when shared.",
      "Studying is improving yourself.",
      "Perseverance is the key to academic success.",
      "Each day of study brings you closer to your goal.",
      "Invest in your mind, it's the only asset that cannot be stolen.",
      "Study is the food of the mind.",
      "Today's difficulties develop tomorrow's strengths.",
      "Knowledge is the best investment you can make.",
      "Every hour of study is a step toward your future.",
      "Never give up on something you really want because of its difficulty.",
      "Your attitude determines your direction.",
      "Education is the passport to the future.",
      "Learning is a journey that lasts a lifetime.",
      "It's not what you know, but what you do with what you know that matters.",
      "A mind that opens to a new idea never returns to its original size."
    ]
  },
  wellbeing: {
    fr: [
      "Prends soin de ton corps, c'est le seul endroit où tu es obligé de vivre.",
      "Le bonheur n'est pas une destination, c'est une façon de voyager.",
      "Respire profondément, laisse partir ce qui ne te sert plus.",
      "Le bien-être commence par l'acceptation de soi.",
      "Nourris ton corps aussi bien que ton esprit.",
      "La paix intérieure commence lorsque tu choisis de ne pas permettre aux autres de contrôler tes émotions.",
      "Tout comme la vague ne peut exister sans l'océan, tu ne peux pas exister sans prendre soin de toi.",
      "Le bien-être est un voyage, pas une destination.",
      "Chaque jour est une nouvelle opportunité de prendre soin de toi.",
      "Aime-toi assez pour offrir à ton esprit, ton corps et ton âme le meilleur.",
      "La guérison commence quand tu écoutes ton corps.",
      "Chaque pas vers le bien-être est un pas vers une vie plus épanouie.",
      "L'équilibre n'est pas quelque chose que tu trouves, c'est quelque chose que tu crées.",
      "Ce n'est pas égoïste de faire ce qui est le mieux pour toi.",
      "Le plus grand cadeau que tu puisses te faire est de prendre soin de ta santé.",
      "La beauté commence quand tu décides d'être toi-même.",
      "Ton bien-être est le fondement de ta vie.",
      "Un esprit calme apporte une force intérieure et une confiance en soi.",
      "Prends le temps d'apprécier les petits plaisirs de la vie.",
      "Le vrai bien-être est l'harmonie entre ton corps, ton esprit et ton âme."
    ],
    en: [
      "Take care of your body, it's the only place you have to live in.",
      "Happiness is not a destination, it's a way of traveling.",
      "Breathe deeply, let go of what no longer serves you.",
      "Well-being begins with self-acceptance.",
      "Nourish your body as well as your mind.",
      "Inner peace begins when you choose not to allow others to control your emotions.",
      "Just as the wave cannot exist without the ocean, you cannot exist without taking care of yourself.",
      "Well-being is a journey, not a destination.",
      "Each day is a new opportunity to take care of yourself.",
      "Love yourself enough to give your mind, body, and soul the best.",
      "Healing begins when you listen to your body.",
      "Every step toward well-being is a step toward a more fulfilling life.",
      "Balance is not something you find, it's something you create.",
      "It's not selfish to do what's best for you.",
      "The greatest gift you can give yourself is taking care of your health.",
      "Beauty begins when you decide to be yourself.",
      "Your well-being is the foundation of your life.",
      "A calm mind brings inner strength and self-confidence.",
      "Take time to appreciate the small pleasures in life.",
      "True well-being is harmony between your body, mind, and soul."
    ]
  },
  parenting: {
    fr: [
      "Chaque jour avec ton enfant est une page blanche à remplir d'amour.",
      "Les enfants apprennent ce qu'ils vivent. Sois leur meilleur exemple.",
      "Écoute ton enfant avec ton cœur, pas seulement avec tes oreilles.",
      "L'amour inconditionnel est le plus beau cadeau que tu puisses offrir à ton enfant.",
      "Sois le parent dont tu as toujours rêvé avoir.",
      "Les moments passés avec tes enfants sont des trésors inestimables.",
      "N'oublie pas que tu es le héros de ton enfant.",
      "La patience est la clé d'une parentalité épanouie.",
      "Chaque enfant est une étoile qui brille différemment.",
      "Élever un enfant, c'est aussi grandir en tant que personne.",
      "La plus grande influence dans la vie d'un enfant est sa famille.",
      "Être parent, c'est enseigner les valeurs qui dureront toute une vie.",
      "Les meilleures traditions familiales sont celles que vous créez ensemble.",
      "Le temps passé avec tes enfants n'est jamais du temps perdu.",
      "Élever des enfants avec amour et respect est le plus grand cadeau que tu puisses faire au monde.",
      "Derrière chaque enfant qui croit en lui-même, il y a un parent qui a cru en lui en premier.",
      "La famille n'est pas une chose importante, c'est tout.",
      "Le cœur d'un parent est l'endroit où ses enfants vivent pour toujours.",
      "L'héritage le plus précieux que tu puisses laisser à tes enfants est les racines de la responsabilité et les ailes de l'indépendance.",
      "Les petits moments créent les plus grands souvenirs."
    ],
    en: [
      "Each day with your child is a blank page to fill with love.",
      "Children learn what they live. Be their best example.",
      "Listen to your child with your heart, not just your ears.",
      "Unconditional love is the most beautiful gift you can offer your child.",
      "Be the parent you always dreamed of having.",
      "Moments spent with your children are priceless treasures.",
      "Never forget that you are your child's hero.",
      "Patience is the key to fulfilling parenting.",
      "Each child is a star that shines differently.",
      "Raising a child also means growing as a person.",
      "The greatest influence in a child's life is their family.",
      "Being a parent is about teaching values that will last a lifetime.",
      "The best family traditions are the ones you create together.",
      "Time spent with your children is never wasted time.",
      "Raising children with love and respect is the greatest gift you can give the world.",
      "Behind every child who believes in themselves is a parent who believed in them first.",
      "Family is not an important thing, it's everything.",
      "A parent's heart is where their children live forever.",
      "The most valuable legacy you can leave your children is the roots of responsibility and the wings of independence.",
      "Small moments create the biggest memories."
    ]
  },
  personalDevelopment: {
    fr: [
      "Sois la meilleure version de toi-même.",
      "Le changement commence en toi.",
      "Chaque jour est une nouvelle opportunité de grandir.",
      "N'aie pas peur d'échouer, aie peur de ne pas essayer.",
      "Ton potentiel est illimité.",
      "Les défis sont des opportunités déguisées.",
      "Chaque petit pas compte.",
      "Investis en toi-même, c'est le meilleur investissement possible.",
      "Ne compare pas ton chapitre 1 au chapitre 20 de quelqu'un d'autre.",
      "Ta seule limite, c'est toi.",
      "Le développement personnel est un voyage qui dure toute une vie.",
      "Ce que tu penses, tu le deviens. Ce que tu ressens, tu l'attires. Ce que tu imagines, tu le crées.",
      "La vie commence à la fin de ta zone de confort.",
      "Change tes pensées et tu changes ton monde.",
      "La confiance en soi est le premier secret du succès.",
      "Le plus grand obstacle à la transformation est le dialogue que tu as avec toi-même.",
      "Avance avec confiance dans la direction de tes rêves.",
      "La discipline est le pont entre tes objectifs et tes accomplissements.",
      "L'autodiscipline est le pouvoir qui te pousse à persévérer même quand la motivation n'est plus là.",
      "Tu n'es pas ce qui t'est arrivé, tu es ce que tu choisis de devenir."
    ],
    en: [
      "Be the best version of yourself.",
      "Change begins with you.",
      "Each day is a new opportunity to grow.",
      "Don't be afraid to fail, be afraid not to try.",
      "Your potential is unlimited.",
      "Challenges are opportunities in disguise.",
      "Every small step counts.",
      "Invest in yourself, it's the best possible investment.",
      "Don't compare your chapter 1 to someone else's chapter 20.",
      "Your only limit is you.",
      "Personal development is a journey that lasts a lifetime.",
      "What you think, you become. What you feel, you attract. What you imagine, you create.",
      "Life begins at the end of your comfort zone.",
      "Change your thoughts and you change your world.",
      "Self-confidence is the first requisite to great undertakings.",
      "The biggest obstacle to transformation is the conversation you have with yourself.",
      "Go confidently in the direction of your dreams.",
      "Discipline is the bridge between your goals and your accomplishments.",
      "Self-discipline is the power that drives you to keep going when motivation is gone.",
      "You are not what happened to you, you are what you choose to become."
    ]
  },
  financialManagement: {
    fr: [
      "Gère ton argent aujourd'hui pour être libre demain.",
      "Chaque euro économisé est un pas vers la liberté financière.",
      "Ne travaille pas pour l'argent, fais en sorte que l'argent travaille pour toi.",
      "Un budget bien géré, c'est une vie plus sereine.",
      "Les petites économies d'aujourd'hui font les grandes richesses de demain.",
      "La patience et la discipline sont les clés de la prospérité financière.",
      "Investis dans tes connaissances financières, elles te rapporteront toute ta vie.",
      "Dépense moins que ce que tu gagnes et investis la différence.",
      "Construis des actifs, pas des dettes.",
      "La liberté financière commence avec une seule bonne décision.",
      "La richesse n'est pas dans ce que tu as, mais dans ce que tu contrôles.",
      "L'indépendance financière est le résultat de milliers de petites décisions.",
      "L'argent ne résout pas tous les problèmes, mais il offre des options.",
      "La fortune favorise l'esprit préparé.",
      "Ta sécurité financière dépend de tes habitudes, pas de tes revenus.",
      "L'argent est un terrible maître mais un excellent serviteur.",
      "Les dettes sont des promesses futures qui limitent ton potentiel présent.",
      "Investir dans la connaissance paie les meilleurs intérêts.",
      "La simplicité volontaire ouvre la voie à la richesse véritable.",
      "L'objectif de l'épargne n'est pas seulement d'avoir de l'argent, mais d'avoir des options pour ton avenir."
    ],
    en: [
      "Manage your money today to be free tomorrow.",
      "Every dollar saved is a step toward financial freedom.",
      "Don't work for money, make money work for you.",
      "A well-managed budget leads to a more serene life.",
      "Today's small savings make tomorrow's great wealth.",
      "Patience and discipline are the keys to financial prosperity.",
      "Invest in your financial knowledge, it will pay off for the rest of your life.",
      "Spend less than you earn and invest the difference.",
      "Build assets, not debts.",
      "Financial freedom begins with a single good decision.",
      "Wealth is not about having money, but about having control.",
      "Financial independence is the result of thousands of small decisions.",
      "Money doesn't solve all problems, but it provides options.",
      "Fortune favors the prepared mind.",
      "Your financial security depends on your habits, not your income.",
      "Money is a terrible master but an excellent servant.",
      "Debts are future promises that limit your present potential.",
      "Investing in knowledge pays the best interest.",
      "Voluntary simplicity paves the way to true wealth.",
      "The goal of saving isn't just to have money, but to have options for your future."
    ]
  }
};

// Helper function to get a random quote based on motivation category and language
export const getRandomQuote = (category: MotivationCategory, language: SupportedLanguage = 'en'): string => {
  // Get quotes for the specified category and language
  const quotes = motivationalQuotes[category][language] || motivationalQuotes[category]['en'] || [];
  
  // If no quotes are available, return a default message
  if (quotes.length === 0) {
    return language === 'fr' 
      ? "Crois en toi et en tout ce que tu es." 
      : "Believe in yourself and all that you are.";
  }
  
  // Return a random quote from the available quotes
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};

// Function to get a random quote for each motivation in the user's selected motivations
export const getMotivationalQuotes = (
  motivations: MotivationCategory[],
  language: SupportedLanguage = 'en'
): string[] => {
  if (!motivations || motivations.length === 0) {
    // Return default quote if no motivations are selected
    return [language === 'fr' 
      ? "Crois en toi et en tout ce que tu es." 
      : "Believe in yourself and all that you are."];
  }
  
  // Get exactly one random quote for each motivation
  return motivations.map(motivation => getRandomQuote(motivation, language));
}; 