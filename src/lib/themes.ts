// Expands a general keyword into a different concrete subject per maze, with
// no API: a built-in category dictionary. "animals" -> cat, dog, rat, ...
// Unknown keywords are used as-is (so "dragon" still just makes dragons).
// Leaf pools are unioned via EXTENDS so primary keywords clear 101 subjects.

const CATEGORIES: Record<string, string[]> = {
  // ---- animal leaves ----------------------------------------------------
  petanimals: [
    'cat', 'dog', 'rabbit', 'hamster', 'guinea pig', 'goldfish', 'parakeet',
    'ferret', 'canary', 'gerbil', 'pet mouse', 'budgie', 'pet hedgehog',
    'chinchilla', 'pet turtle',
  ],
  dogs: [
    'beagle', 'poodle', 'bulldog', 'corgi', 'dachshund', 'husky', 'labrador',
    'pug', 'chihuahua', 'german shepherd', 'rottweiler', 'shiba inu',
    'golden retriever', 'dalmatian', 'boxer dog', 'terrier', 'greyhound',
    'collie', 'pomeranian', 'schnauzer', 'bloodhound', 'mastiff', 'doberman',
    'basset hound', 'border collie', 'australian shepherd', 'akita',
    'samoyed', 'malamute', 'great dane', 'saint bernard', 'newfoundland dog',
    'cocker spaniel', 'springer spaniel', 'jack russell terrier',
    'yorkshire terrier', 'west highland terrier', 'bull terrier',
    'whippet', 'afghan hound', 'irish setter', 'pointer dog', 'weimaraner',
    'vizsla', 'shih tzu', 'maltese dog', 'havanese', 'bichon frise',
    'papillon', 'pekingese', 'lhasa apso', 'french bulldog',
    'boston terrier', 'cavalier spaniel', 'chow chow', 'shar pei',
    'basenji', 'beauceron', 'bernese mountain dog', 'cane corso',
    'dogo argentino', 'pit bull', 'staffordshire terrier', 'pinscher',
    'sheepdog', 'spitz dog', 'corgi puppy', 'labradoodle', 'cockapoo',
    'goldendoodle', 'puggle', 'wolfhound', 'foxhound', 'coonhound',
    'setter dog', 'irish wolfhound', 'scottish deerhound', 'borzoi',
    'saluki', 'pharaoh hound', 'ibizan hound', 'plott hound',
    'old english sheepdog', 'shetland sheepdog', 'belgian malinois',
    'anatolian shepherd', 'kuvasz', 'komondor', 'puli dog', 'briard',
    'leonberger', 'tibetan mastiff', 'neapolitan mastiff', 'bullmastiff',
    'great pyrenees', 'norwegian elkhound', 'keeshond', 'finnish spitz',
    'american eskimo dog', 'shar pei puppy', 'norwich terrier',
    'cairn terrier', 'scottish terrier', 'airedale terrier',
    'wheaten terrier', 'rat terrier', 'toy poodle',
  ],
  cats: [
    'tabby cat', 'siamese cat', 'persian cat', 'sphynx cat', 'bengal cat',
    'maine coon cat', 'ragdoll cat', 'black cat', 'kitten', 'calico cat',
    'tuxedo cat', 'scottish fold cat', 'manx cat', 'lynx point cat',
    'abyssinian cat', 'russian blue cat', 'british shorthair cat',
    'american shorthair cat', 'birman cat', 'burmese cat', 'himalayan cat',
    'norwegian forest cat', 'savannah cat', 'devon rex cat', 'cornish rex cat',
    'oriental cat', 'turkish angora cat', 'tonkinese cat', 'ocicat',
    'snowshoe cat', 'munchkin cat', 'bombay cat', 'chartreux cat',
    'somali cat', 'singapura cat', 'korat cat', 'havana brown cat',
    'egyptian mau cat', 'balinese cat', 'ginger cat', 'white cat',
    'grey cat', 'fluffy kitten', 'sleeping cat', 'curious cat',
    'long-haired cat', 'laperm cat', 'selkirk rex cat', 'american curl cat',
    'japanese bobtail cat', 'pixie-bob cat', 'toyger cat', 'cymric cat',
    'nebelung cat', 'peterbald cat', 'lykoi cat', 'khao manee cat',
    'turkish van cat', 'highlander cat', 'american wirehair cat',
    'kurilian bobtail cat', 'australian mist cat', 'burmilla cat',
    'german rex cat', 'orange tabby cat', 'tortoiseshell cat', 'smoke cat',
    'pointed cat', 'bicolor cat', 'spotted cat', 'mackerel tabby cat',
    'playful kitten', 'chubby cat', 'striped cat', 'siberian cat',
    'lapdog cat',
  ],
  wildcats: [
    'sand cat', 'jungle cat', 'serval', 'caracal', 'margay', 'fishing cat',
    'pampas cat', 'black-footed cat', 'rusty-spotted cat', 'oncilla',
    'geoffroy cat', 'leopard cat', 'marbled cat', 'asian golden cat',
    'jaguarundi', 'pallas cat', 'wildcat', 'clouded leopard', 'fishing wildcat',
    'flat-headed cat',
  ],
  bigcats: [
    'lion', 'tiger', 'leopard', 'jaguar', 'cheetah', 'panther', 'lynx',
    'bobcat', 'cougar', 'snow leopard', 'puma', 'ocelot',
  ],
  bears: [
    'polar bear', 'grizzly bear', 'panda bear', 'brown bear', 'black bear',
    'sun bear', 'sloth bear', 'koala', 'spectacled bear',
  ],
  primates: [
    'monkey', 'gorilla', 'chimpanzee', 'orangutan', 'baboon', 'lemur',
    'gibbon', 'mandrill', 'marmoset', 'macaque',
  ],
  hoofed: [
    'horse', 'cow', 'pig', 'sheep', 'goat', 'deer', 'zebra', 'giraffe',
    'elephant', 'rhinoceros', 'hippopotamus', 'camel', 'donkey', 'moose',
    'bison', 'antelope', 'gazelle', 'llama', 'alpaca', 'ox', 'buffalo',
    'reindeer', 'elk', 'wild boar',
  ],
  smallmammals: [
    'squirrel', 'rat', 'mouse', 'chipmunk', 'beaver', 'hedgehog', 'raccoon',
    'skunk', 'otter', 'badger', 'weasel', 'mole', 'bat', 'opossum',
    'armadillo', 'porcupine', 'meerkat', 'mongoose', 'sloth', 'anteater',
  ],
  wildcanines: [
    'wolf', 'fox', 'coyote', 'jackal', 'dingo', 'arctic fox', 'fennec fox',
    'hyena',
  ],
  marsupials: [
    'kangaroo', 'wombat', 'wallaby', 'tasmanian devil', 'quokka', 'bilby',
  ],
  arctic: [
    'penguin', 'walrus', 'seal', 'snowy owl', 'narwhal', 'husky dog',
    'beluga whale', 'puffin', 'orca', 'arctic hare', 'lemming',
  ],
  desert: [
    'camel', 'desert scorpion', 'desert snake', 'desert lizard',
    'fennec fox', 'meerkat', 'desert vulture', 'desert tortoise', 'jackal',
    'roadrunner', 'jerboa',
  ],
  forest: [
    'deer', 'wolf', 'fox', 'brown bear', 'squirrel', 'forest owl', 'rabbit',
    'hedgehog', 'raccoon', 'moose', 'porcupine', 'beaver', 'chipmunk',
  ],
  pond: [
    'frog', 'duck', 'pond turtle', 'dragonfly', 'koi fish', 'newt',
    'tadpole', 'water lily', 'pond crane', 'water snail',
  ],
  jungle: [
    'jungle lion', 'jungle tiger', 'jungle elephant', 'jungle monkey',
    'gorilla', 'jungle leopard', 'jungle panther', 'jaguar', 'jungle sloth',
    'jungle parrot', 'jungle snake', 'tapir',
  ],
  farm: [
    'cow', 'pig', 'sheep', 'goat', 'chicken', 'horse', 'farm duck',
    'rooster', 'donkey', 'farm llama', 'turkey', 'farm goose', 'piglet',
    'lamb', 'calf',
  ],
  rodents: [
    'mouse', 'rat', 'squirrel', 'chipmunk', 'beaver', 'hamster', 'gerbil',
    'guinea pig', 'capybara', 'porcupine', 'groundhog',
  ],
  nocturnal: [
    'owl', 'bat', 'raccoon', 'night hedgehog', 'opossum', 'night fox',
    'flying squirrel', 'firefly', 'aye-aye',
  ],

  // ---- bird leaves ------------------------------------------------------
  songbirds: [
    'robin', 'sparrow', 'finch', 'cardinal bird', 'blue jay', 'canary',
    'nightingale', 'wren', 'starling', 'lark', 'chickadee', 'mockingbird',
    'oriole', 'bunting bird',
  ],
  birdsofprey: [
    'eagle', 'hawk', 'falcon', 'great owl', 'vulture', 'osprey', 'condor',
    'kite bird', 'buzzard', 'kestrel',
  ],
  waterfowl: [
    'duck', 'goose', 'swan', 'pelican', 'flamingo', 'heron', 'stork',
    'crane bird', 'cormorant', 'mallard', 'teal bird',
  ],
  tropicalbirds: [
    'parrot', 'toucan', 'macaw', 'cockatoo', 'peacock', 'kingfisher',
    'hummingbird', 'parakeet', 'lovebird', 'lorikeet', 'hornbill',
  ],
  flightlessbirds: [
    'penguin', 'ostrich', 'emu', 'kiwi bird', 'dodo bird', 'cassowary',
    'rhea bird',
  ],
  commonbirds: [
    'pigeon', 'crow', 'raven', 'seagull', 'woodpecker', 'swallow', 'magpie',
    'dove', 'turkey', 'rooster', 'chicken', 'quail', 'pheasant', 'cuckoo',
    'jackdaw', 'partridge', 'grouse', 'guineafowl', 'swift bird',
    'house martin', 'kingbird', 'flycatcher', 'bee-eater', 'roller bird',
  ],
  shorebirds: [
    'albatross', 'gannet', 'tern', 'sandpiper', 'plover', 'ibis',
    'spoonbill', 'egret', 'kookaburra', 'puffin', 'gull', 'oystercatcher',
  ],
  morebirds: [
    'nuthatch', 'treecreeper', 'warbler', 'tanager', 'grosbeak', 'waxwing',
    'thrush', 'blackbird', 'jay bird', 'nutcracker bird', 'ptarmigan',
    'peafowl', 'budgerigar', 'cockatiel', 'finch bird', 'siskin',
    'bullfinch', 'goldfinch', 'chaffinch', 'kingfisher bird',
    'bird of paradise', 'sunbird', 'weaver bird', 'shrike', 'dipper bird',
  ],

  // ---- sea leaves -------------------------------------------------------
  fish: [
    'clownfish', 'goldfish', 'angelfish', 'pufferfish', 'swordfish', 'tuna',
    'salmon', 'catfish', 'betta fish', 'koi fish', 'anglerfish',
    'flying fish', 'parrotfish', 'lionfish', 'marlin',
  ],
  sharks: [
    'great white shark', 'hammerhead shark', 'tiger shark', 'whale shark',
    'nurse shark', 'bull shark', 'reef shark', 'mako shark',
  ],
  marinemammals: [
    'dolphin', 'whale', 'orca', 'sea lion', 'manatee', 'narwhal',
    'beluga whale', 'porpoise', 'sea otter', 'fur seal',
  ],
  shellfish: [
    'crab', 'lobster', 'shrimp', 'prawn', 'crayfish', 'hermit crab',
    'barnacle',
  ],
  cephalopods: ['octopus', 'squid', 'cuttlefish', 'nautilus'],
  reefcreatures: [
    'seahorse', 'jellyfish', 'starfish', 'sea turtle', 'stingray', 'coral',
    'sea urchin', 'sea anemone', 'sea slug', 'moray eel', 'sand dollar',
    'manta ray', 'electric eel', 'sea dragon', 'sea cucumber', 'sea sponge',
    'mantis shrimp', 'horseshoe crab', 'sea snake', 'sea star',
  ],
  morefish: [
    'sailfish', 'herring', 'mackerel', 'sardine', 'cod fish', 'halibut',
    'flounder', 'sturgeon', 'barracuda', 'grouper', 'snapper',
    'triggerfish', 'surgeonfish', 'damselfish', 'guppy', 'piranha',
    'eel', 'sea bass',
  ],
  shellcreatures: [
    'mussel', 'clam', 'scallop', 'oyster', 'conch shell', 'periwinkle',
    'cockle', 'whelk',
  ],
  moresealife: [
    'blue whale', 'humpback whale', 'sperm whale', 'great barracuda',
    'lobster claw', 'spiny lobster', 'sea lion', 'leopard seal',
    'angler fish', 'lanternfish', 'viperfish', 'gulper eel', 'sunfish',
    'sea turtle hatchling', 'baby dolphin', 'reef shark', 'whale shark',
    'cuttlefish', 'sea otter', 'sea pig', 'comb jelly', 'sea pen',
  ],

  // ---- bug leaves -------------------------------------------------------
  insectsbase: [
    'butterfly', 'bee', 'ant', 'ladybug', 'beetle', 'dragonfly',
    'grasshopper', 'caterpillar', 'moth', 'firefly', 'wasp', 'mosquito',
    'cricket', 'cicada', 'termite', 'hornet', 'weevil', 'gnat', 'aphid',
    'bumblebee', 'cockroach', 'locust', 'katydid', 'flea', 'louse',
  ],
  arachnids: [
    'spider', 'scorpion', 'tarantula', 'tick', 'mite', 'daddy longlegs',
    'black widow spider', 'jumping spider', 'wolf spider',
    'orb weaver spider', 'huntsman spider', 'whip scorpion',
  ],
  crawlies: [
    'snail', 'slug', 'earthworm', 'centipede', 'millipede', 'grub',
    'leech', 'roly poly bug', 'inchworm', 'mealworm', 'glowworm',
    'springtail', 'woodlouse', 'caterpillar grub', 'flatworm',
    'velvet worm', 'silkworm', 'maggot',
  ],
  moreinsects: [
    'praying mantis', 'stick insect', 'stag beetle', 'rhino beetle',
    'dung beetle', 'june bug', 'leafhopper', 'mayfly', 'lacewing',
    'silverfish', 'earwig', 'horsefly', 'fruit fly', 'damselfly',
    'water strider', 'leaf insect', 'antlion', 'dobsonfly', 'water beetle',
    'pond skater', 'treehopper', 'planthopper', 'shield bug', 'stink bug',
    'assassin bug', 'bedbug', 'thrips', 'scale insect', 'hoverfly',
  ],
  butterflies: [
    'monarch butterfly', 'swallowtail butterfly', 'blue morpho butterfly',
    'painted lady butterfly', 'cabbage white butterfly',
    'peacock butterfly', 'tiger moth', 'luna moth', 'atlas moth',
    'hawk moth', 'emperor moth', 'skipper butterfly',
  ],
  beetles: [
    'ladybird beetle', 'click beetle', 'tiger beetle', 'longhorn beetle',
    'jewel beetle', 'ground beetle', 'scarab beetle', 'firefly beetle',
    'leaf beetle', 'bark beetle',
  ],

  // ---- reptiles / amphibians / dinos -----------------------------------
  reptiles: [
    'snake', 'lizard', 'crocodile', 'gecko', 'chameleon', 'iguana',
    'tortoise', 'komodo dragon', 'cobra', 'alligator', 'python',
    'rattlesnake', 'viper', 'monitor lizard', 'skink', 'anole lizard',
    'boa constrictor', 'sea turtle', 'gila monster', 'bearded dragon',
    'king cobra', 'anaconda', 'black mamba', 'sidewinder snake',
    'corn snake', 'milk snake', 'coral snake', 'garter snake',
    'horned lizard', 'frilled lizard', 'basilisk lizard', 'tegu lizard',
    'caiman', 'gharial', 'tuatara', 'marine iguana', 'leopard gecko',
    'tokay gecko', 'panther chameleon', 'veiled chameleon',
    'box turtle', 'snapping turtle', 'painted turtle', 'terrapin',
    'galapagos tortoise', 'green sea turtle', 'leatherback turtle',
    'crested gecko', 'glass lizard',
  ],
  amphibians: [
    'frog', 'toad', 'salamander', 'newt', 'tree frog', 'axolotl',
    'bullfrog', 'tadpole', 'poison dart frog', 'mudpuppy',
  ],
  dinosaurs: [
    'tyrannosaurus rex', 'triceratops', 'stegosaurus', 'velociraptor',
    'brachiosaurus', 'pteranodon', 'spinosaurus', 'ankylosaurus',
    'diplodocus', 'parasaurolophus', 'allosaurus', 'apatosaurus',
    'iguanodon', 'pachycephalosaurus', 'gallimimus', 'dilophosaurus',
    'brontosaurus', 'archaeopteryx', 'compsognathus', 'carnotaurus',
    'deinonychus', 'megalosaurus', 'plesiosaurus', 'mosasaurus',
    'pterodactyl', 'protoceratops', 'oviraptor', 'baryonyx',
    'styracosaurus', 'utahraptor', 'albertosaurus', 'giganotosaurus',
    'argentinosaurus', 'camarasaurus', 'ceratosaurus', 'coelophysis',
    'corythosaurus', 'edmontosaurus', 'kentrosaurus', 'lambeosaurus',
    'maiasaura', 'microraptor', 'nodosaurus', 'plateosaurus', 'troodon',
    'therizinosaurus', 'sauropelta', 'suchomimus', 'amargasaurus',
    'cryolophosaurus', 'dracorex', 'herrerasaurus', 'nigersaurus',
    'concavenator', 'gigantoraptor', 'torosaurus', 'pentaceratops',
    'einiosaurus', 'brachylophosaurus', 'megaraptor', 'sinosauropteryx',
    'dreadnoughtus', 'acrocanthosaurus', 'abelisaurus', 'hadrosaurus',
  ],
  prehistoric: [
    'woolly mammoth', 'saber-tooth tiger', 'cave bear', 'giant ground sloth',
    'woolly rhino', 'dire wolf', 'megalodon', 'terror bird', 'glyptodon',
    'giant dragonfly', 'dimetrodon', 'mastodon', 'giant beaver',
    'irish elk', 'cave lion', 'short-faced bear', 'ammonite', 'trilobite',
  ],

  // ---- vehicle leaves ---------------------------------------------------
  cars: [
    'sedan car', 'suv', 'sports car', 'classic car', 'taxi', 'limousine',
    'jeep', 'hatchback', 'convertible', 'minivan', 'station wagon',
    'muscle car', 'electric car', 'race car', 'buggy',
  ],
  trucks: [
    'dump truck', 'tow truck', 'garbage truck', 'monster truck',
    'semi truck', 'tanker truck', 'delivery truck', 'ice cream truck',
    'pickup truck', 'flatbed truck', 'cement truck', 'logging truck',
  ],
  planes: [
    'airplane', 'jet airliner', 'biplane', 'glider', 'fighter jet',
    'seaplane', 'crop duster', 'private jet', 'cargo plane',
    'propeller plane', 'stealth bomber', 'passenger jet',
  ],
  helicopters: [
    'helicopter', 'rescue helicopter', 'military helicopter',
    'news helicopter', 'chinook helicopter',
  ],
  boats: [
    'sailboat', 'yacht', 'kayak', 'canoe', 'rowboat', 'submarine', 'ferry',
    'cruise ship', 'speedboat', 'gondola', 'fishing boat', 'tugboat',
    'catamaran', 'raft', 'pontoon boat', 'jet ski',
  ],
  trains: [
    'steam train', 'bullet train', 'cargo train', 'locomotive', 'tram',
    'monorail', 'subway train', 'freight train', 'caboose',
  ],
  bikes: [
    'bicycle', 'motorcycle', 'scooter', 'unicycle', 'tricycle',
    'mountain bike', 'tandem bicycle', 'electric scooter', 'dirt bike',
    'bmx bike', 'moped',
  ],
  emergencyvehicles: [
    'fire truck', 'ambulance', 'police car', 'rescue helicopter',
    'tow truck', 'coast guard boat', 'swat van',
  ],
  construction: [
    'bulldozer', 'excavator', 'crane truck', 'cement mixer', 'forklift',
    'steamroller', 'backhoe', 'wheelbarrow', 'road roller', 'digger',
    'pile driver',
  ],
  military: [
    'tank', 'warship', 'armored car', 'humvee', 'aircraft carrier',
    'cannon', 'army jeep', 'missile launcher', 'battleship',
  ],
  spacevehicles: [
    'rocket', 'space shuttle', 'lunar rover', 'space capsule', 'mars rover',
    'satellite', 'space station', 'flying saucer',
  ],
  othervehicles: [
    'hot air balloon', 'blimp', 'tractor', 'golf cart', 'snowmobile',
    'go-kart', 'trolley', 'cable car', 'segway', 'rickshaw', 'sled',
    'horse carriage',
  ],

  // ---- food leaves ------------------------------------------------------
  fruits: [
    'apple', 'banana', 'pear', 'cherry', 'strawberry', 'grapes',
    'watermelon', 'pineapple', 'orange', 'lemon', 'peach', 'mango', 'kiwi',
    'avocado', 'coconut', 'pomegranate', 'blueberry', 'raspberry', 'plum',
    'apricot', 'fig', 'lime', 'papaya', 'dragon fruit', 'passion fruit',
    'lychee', 'cantaloupe', 'blackberry', 'cranberry', 'grapefruit',
  ],
  vegetables: [
    'carrot', 'broccoli', 'tomato', 'pumpkin', 'corn', 'eggplant',
    'bell pepper', 'mushroom', 'onion', 'potato', 'cucumber', 'pea pod',
    'cabbage', 'beet', 'radish', 'lettuce', 'spinach', 'celery',
    'asparagus', 'cauliflower', 'zucchini', 'garlic', 'sweet potato',
    'turnip', 'leek', 'artichoke', 'brussels sprout', 'kale',
    'chili pepper', 'squash',
  ],
  desserts: [
    'cake slice', 'cupcake', 'donut', 'ice cream cone', 'ice cream sundae',
    'pie slice', 'cheesecake', 'eclair', 'macaron', 'gelato', 'cookie',
    'brownie', 'tiramisu', 'pudding', 'churro', 'cinnamon roll', 'jelly',
    'popsicle', 'parfait', 'mousse cup',
  ],
  bakery: [
    'croissant', 'baguette', 'bagel', 'pretzel', 'muffin', 'scone',
    'loaf of bread', 'dinner roll', 'doughnut', 'danish pastry', 'biscuit',
    'pita bread', 'breadstick', 'sourdough loaf',
  ],
  breakfast: [
    'pancakes', 'waffle', 'fried egg', 'omelette', 'bacon strip', 'sausage',
    'cereal bowl', 'toast', 'avocado toast', 'yogurt cup', 'granola',
    'hash browns', 'french toast',
  ],
  snacks: [
    'popcorn bucket', 'potato chips', 'nachos', 'cracker', 'rice ball',
    'granola bar', 'trail mix', 'cheese cube', 'olives', 'pickle',
    'beef jerky', 'rice cake',
  ],
  drinks: [
    'coffee cup', 'teacup', 'soda can', 'milkshake', 'juice box',
    'wine glass', 'beer mug', 'cocktail glass', 'water bottle',
    'milk carton', 'smoothie', 'hot chocolate mug', 'lemonade',
    'bubble tea', 'soda bottle',
  ],
  fastfood: [
    'pizza slice', 'hamburger', 'hot dog', 'taco', 'burrito',
    'french fries', 'fried chicken', 'sandwich', 'kebab', 'sub sandwich',
    'corn dog', 'chicken nuggets', 'onion rings',
  ],
  candies: [
    'lollipop', 'candy cane', 'jelly bean', 'gumball', 'chocolate bar',
    'gummy bear', 'wrapped candy', 'rock candy', 'caramel', 'liquorice',
    'marshmallow', 'peppermint candy', 'candy corn',
  ],
  worldfoods: [
    'sushi roll', 'ramen bowl', 'dumpling', 'spring roll', 'curry plate',
    'paella', 'falafel', 'pad thai', 'sushi nigiri', 'pho bowl', 'tamale',
    'pierogi', 'gyoza', 'samosa',
  ],
  dairyeggs: [
    'cheese wedge', 'milk bottle', 'butter stick', 'egg', 'yogurt pot',
    'ice cream scoop',
  ],

  // ---- nature leaves ----------------------------------------------------
  flowers: [
    'rose', 'sunflower', 'tulip', 'daisy', 'lotus', 'orchid', 'lily',
    'cherry blossom', 'dandelion', 'hibiscus', 'poppy', 'lavender',
    'marigold', 'carnation', 'iris flower', 'peony', 'daffodil', 'violet',
    'chrysanthemum', 'bluebell', 'magnolia', 'water lily', 'jasmine',
    'buttercup', 'foxglove', 'gerbera daisy', 'aster flower', 'begonia',
    'camellia', 'dahlia', 'gardenia', 'geranium', 'hyacinth', 'lilac',
    'pansy', 'petunia', 'primrose', 'snapdragon', 'sweet pea', 'zinnia',
    'azalea', 'crocus', 'freesia', 'gladiolus', 'hydrangea',
    'morning glory', 'ranunculus', 'wisteria', 'cosmos flower', 'calendula',
  ],
  trees: [
    'oak tree', 'pine tree', 'palm tree', 'willow tree', 'maple tree',
    'cherry blossom tree', 'baobab tree', 'bonsai tree', 'apple tree',
    'redwood tree', 'birch tree', 'fir tree', 'cypress tree', 'elm tree',
    'aspen tree', 'banyan tree', 'spruce tree', 'cedar tree', 'beech tree',
    'ash tree', 'walnut tree', 'chestnut tree', 'sycamore tree',
    'poplar tree', 'dogwood tree', 'olive tree', 'lemon tree',
    'eucalyptus tree', 'acacia tree', 'juniper tree',
  ],
  plants: [
    'fern', 'ivy', 'bamboo', 'clover', 'moss', 'vine', 'succulent',
    'aloe vera', 'grass tuft', 'cattail', 'wheat stalk', 'sprout',
    'sunflower sprout', 'tumbleweed', 'venus flytrap', 'pitcher plant',
    'thistle', 'reed', 'fern frond', 'seaweed', 'shamrock', 'bramble',
    'nettle', 'pampas grass',
  ],
  cacti: [
    'saguaro cactus', 'prickly pear cactus', 'barrel cactus',
    'cholla cactus', 'fishhook cactus', 'star cactus', 'moon cactus',
  ],
  mushroomslist: [
    'red toadstool', 'button mushroom', 'morel mushroom',
    'shiitake mushroom', 'enoki mushroom', 'truffle',
    'chanterelle mushroom', 'fly agaric mushroom',
  ],
  mountains: [
    'mount fuji', 'snowy mountain', 'volcano', 'mountain peak', 'mesa',
    'rocky cliff', 'green hill', 'canyon', 'glacier', 'plateau',
  ],
  waterfeatures: [
    'waterfall', 'river bend', 'lake', 'pond', 'natural spring', 'geyser',
    'fjord', 'tropical island', 'sandy beach', 'desert oasis', 'lagoon',
    'stream',
  ],
  weather: [
    'cloud', 'lightning bolt', 'rainbow', 'snowflake', 'tornado',
    'raindrop', 'sun', 'storm cloud', 'umbrella', 'sun behind cloud',
    'hurricane swirl', 'hailstone', 'fog bank', 'sleet', 'dust storm',
    'thunderstorm', 'blizzard', 'snowstorm', 'rain cloud', 'drizzle',
    'downpour', 'frost pattern', 'dew drop', 'puddle', 'wind gust',
    'weather vane', 'thermometer', 'barometer', 'icicle', 'heat wave',
  ],
  sky: [
    'sunrise', 'sunset', 'blue sky', 'night sky', 'aurora', 'twilight',
    'half moon', 'starry sky', 'cloudy sky', 'overcast sky', 'mist',
    'crescent moon', 'shooting star', 'morning sun', 'rain shower',
  ],
  gemstones: [
    'diamond', 'ruby', 'emerald', 'sapphire', 'amethyst', 'topaz', 'opal',
    'pearl', 'rough crystal', 'gold nugget', 'quartz crystal', 'jade stone',
    'garnet', 'turquoise',
  ],
  foliage: [
    'maple leaf', 'oak leaf', 'fern leaf', 'pinecone', 'acorn',
    'autumn leaf', 'four leaf clover', 'palm frond',
  ],
  landforms: [
    'desert dune', 'green valley', 'cave', 'arch rock', 'coral reef',
    'swamp', 'meadow', 'cliffside',
  ],

  // ---- sports leaves ----------------------------------------------------
  ballsports: [
    'soccer ball', 'basketball', 'baseball', 'football', 'tennis ball',
    'volleyball', 'golf ball', 'bowling ball', 'rugby ball',
    'ping pong ball', 'beach ball', 'dodgeball', 'cricket ball',
  ],
  racketsports: [
    'tennis racket', 'badminton racket', 'ping pong paddle',
    'squash racket', 'pickleball paddle', 'racquetball racket',
  ],
  wintersports: [
    'snowboard', 'ski', 'ice skate', 'hockey stick', 'sled',
    'curling stone', 'snowmobile', 'bobsled', 'ski pole', 'hockey puck',
  ],
  watersports: [
    'surfboard', 'kayak paddle', 'paddleboard', 'jet ski', 'snorkel',
    'scuba mask', 'rowing oar', 'water ski', 'wakeboard', 'diving fin',
  ],
  gym: [
    'dumbbell', 'kettlebell', 'barbell', 'treadmill', 'jump rope',
    'yoga mat', 'punching bag', 'medicine ball', 'pull up bar',
    'exercise bike',
  ],
  extreme: [
    'skateboard', 'bmx bike', 'roller skate', 'parachute', 'climbing axe',
    'wingsuit', 'hang glider', 'bungee cord',
  ],
  sportsgear: [
    'boxing glove', 'baseball bat', 'baseball glove', 'sports helmet',
    'whistle', 'stopwatch', 'trophy', 'medal', 'gold cup', 'referee flag',
    'scoreboard', 'cleats',
  ],
  teamsports: [
    'hockey net', 'basketball hoop', 'soccer goal', 'tennis net',
    'baseball base', 'cricket wicket', 'volleyball net', 'goalpost',
  ],
  athletics: [
    'running shoe', 'hurdle', 'javelin', 'discus', 'shot put',
    'relay baton', 'high jump bar', 'pole vault', 'starting block',
  ],
  martialarts: [
    'karate belt', 'nunchucks', 'taekwondo kick', 'judo mat',
    'fencing sword', 'kendo stick', 'boxing ring', 'karate gi',
  ],
  sportsmisc: [
    'frisbee', 'archery bow', 'dartboard', 'billiard ball', 'fishing rod',
    'golf club', 'hockey mask', 'sports jersey', 'sweatband', 'ski goggles',
    'climbing rope', 'roller blade',
  ],

  // ---- building leaves --------------------------------------------------
  houses: [
    'cottage', 'mansion', 'log cabin', 'treehouse', 'townhouse',
    'apartment building', 'farmhouse', 'beach house', 'bungalow', 'villa',
    'tiny house', 'mobile home', 'duplex house', 'chalet',
  ],
  landmarks: [
    'eiffel tower', 'statue of liberty', 'pyramid', 'taj mahal', 'big ben',
    'leaning tower of pisa', 'colosseum', 'sydney opera house', 'sphinx',
    'arc de triomphe', 'stonehenge', 'great wall', 'golden gate bridge',
    'christ the redeemer', 'mount rushmore', 'space needle',
    'burj khalifa', 'london eye',
  ],
  religious: [
    'church', 'mosque', 'temple', 'pagoda', 'cathedral', 'chapel',
    'synagogue', 'shrine', 'monastery', 'bell tower',
  ],
  modernbuildings: [
    'skyscraper', 'glass tower', 'stadium', 'shopping mall',
    'airport terminal', 'museum', 'library building', 'hospital building',
    'hotel building', 'office tower', 'parking garage',
  ],
  historic: [
    'castle', 'fortress', 'windmill', 'lighthouse', 'aqueduct',
    'medieval gate', 'watchtower', 'citadel', 'palace', 'ancient ruins',
    'amphitheater',
  ],
  structures: [
    'bridge', 'tower', 'barn', 'grain silo', 'water tower', 'gazebo',
    'greenhouse', 'tent', 'igloo', 'dam', 'observatory', 'fire station',
    'school building', 'bank building', 'factory', 'gas station',
    'train station', 'city hall', 'clock tower', 'drawbridge', 'pier',
    'ferris wheel', 'water mill', 'windmill tower', 'town gate',
    'stone archway', 'monument', 'gatehouse', 'bus stop', 'phone booth',
    'street lamp', 'fountain',
  ],
  homestyles: [
    'teepee', 'yurt', 'houseboat', 'stilt house', 'adobe house',
    'thatched cottage', 'ranch house', 'manor house', 'dome house',
    'gingerbread house', 'sandcastle', 'dollhouse', 'birdhouse',
    'doghouse', 'clubhouse', 'garden shed',
  ],

  // ---- clothing leaves --------------------------------------------------
  tops: [
    't-shirt', 'sweater', 'hoodie', 'blouse', 'tank top', 'polo shirt',
    'button shirt', 'turtleneck', 'crop top', 'cardigan', 'flannel shirt',
  ],
  bottoms: [
    'jeans', 'shorts', 'skirt', 'leggings', 'trousers', 'sweatpants',
    'overalls', 'capri pants', 'cargo pants',
  ],
  outerwear: [
    'jacket', 'winter coat', 'raincoat', 'parka', 'blazer', 'windbreaker',
    'poncho', 'cloak', 'trench coat', 'denim jacket', 'puffer jacket',
  ],
  hats: [
    'cowboy hat', 'top hat', 'baseball cap', 'beanie', 'sombrero', 'fedora',
    'witch hat', 'graduation cap', 'pirate hat', 'crown', 'sun hat',
    'beret', 'bucket hat', 'chef hat', 'hard hat',
  ],
  shoes: [
    'sneaker', 'high heel', 'boot', 'flip flop', 'sandal', 'loafer',
    'snow boot', 'rain boot', 'slipper', 'running shoe', 'ballet flat',
    'cowboy boot', 'hiking boot', 'clog',
  ],
  accessories: [
    'sunglasses', 'umbrella', 'handbag', 'backpack', 'wallet', 'wristwatch',
    'necklace', 'ring', 'earring', 'belt', 'necktie', 'bowtie', 'scarf',
    'gloves', 'mittens', 'bracelet', 'hairband', 'purse', 'eyeglasses',
    'brooch', 'anklet', 'hair clip', 'bandana', 'suspenders',
    'pocket square', 'cufflink', 'wristband', 'tote bag', 'fanny pack',
    'monocle', 'pendant', 'hair bow', 'headphones', 'earmuffs',
  ],
  swimwear: [
    'bikini', 'swim trunks', 'swim cap', 'goggles', 'wetsuit', 'flippers',
    'one-piece swimsuit',
  ],
  formalwear: [
    'tuxedo', 'wedding dress', 'business suit', 'ball gown', 'evening dress',
    'dress shirt', 'cufflinks', 'cocktail dress',
  ],

  // ---- jobs (101+ direct) ----------------------------------------------
  jobs: [
    'firefighter', 'doctor', 'nurse', 'chef', 'police officer', 'teacher',
    'astronaut', 'pilot', 'farmer', 'scientist', 'painter', 'plumber',
    'electrician', 'mechanic', 'soldier', 'sailor', 'judge', 'dentist',
    'photographer', 'baker', 'barber', 'veterinarian', 'lawyer', 'waiter',
    'magician', 'detective', 'lifeguard', 'fisherman', 'carpenter',
    'architect', 'engineer', 'programmer', 'accountant', 'librarian',
    'journalist', 'actor', 'musician', 'dancer', 'singer', 'athlete',
    'coach', 'referee', 'surgeon', 'paramedic', 'pharmacist', 'therapist',
    'banker', 'cashier', 'salesperson', 'receptionist', 'manager',
    'flight attendant', 'train conductor', 'bus driver', 'taxi driver',
    'truck driver', 'mail carrier', 'janitor', 'gardener', 'florist',
    'butcher', 'tailor', 'shoemaker', 'blacksmith', 'welder', 'miner',
    'lumberjack', 'rancher', 'beekeeper', 'zookeeper', 'park ranger',
    'marine biologist', 'geologist', 'astronomer', 'archaeologist',
    'historian', 'professor', 'principal', 'nanny', 'social worker',
    'counselor', 'priest', 'monk', 'general', 'admiral', 'spy',
    'diplomat', 'mayor', 'king', 'queen', 'jester', 'clown', 'acrobat',
    'juggler', 'ringmaster', 'bartender', 'tour guide', 'translator',
    'illustrator', 'animator', 'fashion designer', 'sculptor', 'potter',
    'jeweler', 'watchmaker', 'locksmith', 'bricklayer', 'roofer',
    'window cleaner', 'surveyor', 'air traffic controller', 'astronaut trainer',
    'crossing guard', 'mailman', 'newscaster', 'weather forecaster',
  ],

  // ---- space leaves -----------------------------------------------------
  planets: [
    'planet mercury', 'planet venus', 'planet earth', 'planet mars',
    'planet jupiter', 'planet saturn', 'planet uranus', 'planet neptune',
    'planet pluto', 'gas giant planet',
  ],
  celestial: [
    'sun', 'crescent moon', 'full moon', 'star', 'shooting star', 'comet',
    'asteroid', 'spiral galaxy', 'black hole', 'nebula', 'constellation',
    'solar eclipse', 'meteor', 'supernova', 'milky way',
  ],
  spacecraft: [
    'rocket', 'space shuttle', 'satellite', 'space station', 'lunar rover',
    'space capsule', 'mars rover', 'flying saucer', 'space probe',
    'lunar lander', 'space telescope', 'space drone',
  ],
  spacepeople: [
    'astronaut', 'alien', 'cosmonaut', 'space explorer', 'martian',
    'space tourist',
  ],
  spacestuff: [
    'space helmet', 'moon crater', 'space suit', 'observatory dome',
    'launch pad', 'mission control', 'satellite dish', 'star telescope',
    'planet ring', 'jetpack', 'rocket booster', 'escape pod',
    'solar panel array', 'moon base', 'space flag', 'lunar module',
    'space buggy', 'orbital station', 'space gloves', 'oxygen tank',
  ],
  astronomy: [
    'orion constellation', 'big dipper', 'north star', 'comet tail',
    'saturn rings', 'blue moon', 'harvest moon', 'solar flare',
    'star cluster', 'meteor shower', 'space rock', 'dwarf planet',
    'binary star', 'cosmic cloud', 'ringed planet', 'asteroid belt',
    'galaxy spiral', 'star map', 'wormhole', 'cosmic dust', 'star trail',
    'planet orbit', 'solar system model', 'crescent earth',
  ],

  // ---- robots / sci-fi --------------------------------------------------
  robots: [
    'robot', 'android', 'drone', 'mech robot', 'cyborg', 'robot arm',
    'vacuum robot', 'humanoid robot', 'flying robot', 'battle robot',
    'toy robot', 'robot dog', 'robot head', 'factory robot', 'nanobot',
    'robot bee', 'walking robot', 'transformer robot', 'space robot',
    'robot cat', 'rover robot', 'claw robot', 'tank robot', 'soccer robot',
    'helper robot', 'tiny robot', 'giant robot', 'spider robot',
  ],
  scifi: [
    'alien spaceship', 'laser gun', 'time machine', 'teleporter',
    'force field', 'hologram', 'ray gun', 'light saber', 'plasma rifle',
    'alien egg', 'space portal', 'death ray',
  ],

  // ---- mythical / monsters ----------------------------------------------
  mythical: [
    'dragon', 'unicorn', 'mermaid', 'phoenix', 'griffin', 'fairy',
    'centaur', 'pegasus', 'wizard', 'minotaur', 'kraken', 'yeti', 'elf',
    'dwarf', 'giant', 'witch', 'genie', 'hydra', 'cyclops', 'gnome',
    'leprechaun', 'pixie', 'gargoyle', 'basilisk', 'chimera', 'manticore',
    'cerberus', 'golem', 'angel', 'valkyrie', 'cupid', 'satyr',
    'nymph', 'sea serpent', 'fire spirit', 'wyvern', 'hippogriff',
    'jackalope', 'thunderbird', 'kitsune', 'selkie', 'leviathan',
    'behemoth', 'roc bird', 'harpy', 'gorgon', 'medusa', 'siren',
    'naga', 'garuda', 'qilin', 'bunyip', 'chupacabra', 'mothman',
    'krampus', 'frost giant', 'fire dragon', 'ice dragon',
    'two-headed dragon', 'baby dragon', 'will-o-wisp', 'treant',
    'hobgoblin', 'sphinx creature',
  ],
  monsters: [
    'frankenstein monster', 'vampire', 'werewolf', 'zombie', 'mummy',
    'ghost', 'swamp creature', 'slime monster', 'one-eyed monster',
    'furry monster', 'horned monster', 'lake monster', 'cave troll',
    'goblin', 'ogre', 'troll', 'demon', 'banshee', 'imp', 'bigfoot',
    'sea monster', 'rock monster', 'shadow monster', 'fanged monster',
    'tentacle monster', 'three-eyed monster', 'blob creature',
    'fungus monster', 'robot monster', 'closet monster', 'swamp thing',
    'abominable snowman', 'gillman', 'giant spider monster', 'mutant',
    'cyclops monster', 'two-headed monster', 'spiky monster',
  ],

  // ---- tools / hardware -------------------------------------------------
  tools: [
    'hammer', 'wrench', 'screwdriver', 'saw', 'power drill', 'pliers',
    'axe', 'paint roller', 'shovel', 'scissors', 'chisel', 'level tool',
    'tape measure', 'sledgehammer', 'crowbar', 'hand saw', 'mallet',
    'paint brush', 'utility knife', 'clamp', 'file tool', 'soldering iron',
    'tool box', 'nail', 'screw', 'bolt', 'gear', 'wheelbarrow',
    'allen key', 'putty knife', 'wire cutter', 'staple gun', 'jigsaw tool',
    'circular saw', 'angle grinder', 'power sander', 'router tool',
    'hand plane', 'bench vise', 'anvil', 'pickaxe', 'pitchfork', 'scythe',
    'machete', 'pruning shears', 'drill bit', 'caulk gun', 'paint can',
    'sawhorse', 'step ladder', 'spirit level', 'monkey wrench',
    'nail gun', 'hex key', 'spanner',
  ],

  // ---- household --------------------------------------------------------
  bedroom: [
    'bed', 'pillow', 'alarm clock', 'lamp', 'wardrobe', 'mirror',
    'nightstand', 'blanket', 'dresser',
  ],
  bathroom: [
    'bathtub', 'toilet', 'sink', 'shower head', 'toothbrush',
    'shampoo bottle', 'hairdryer', 'razor', 'soap bar', 'towel',
  ],
  appliances: [
    'refrigerator', 'microwave', 'washing machine', 'dishwasher', 'oven',
    'air conditioner', 'vacuum cleaner', 'electric fan', 'toaster',
    'blender', 'kettle', 'coffee maker',
  ],
  furniture: [
    'sofa', 'armchair', 'dining chair', 'desk', 'bookshelf', 'coffee table',
    'rocking chair', 'bench', 'ottoman', 'stool', 'dresser', 'wardrobe',
    'dining table', 'side table', 'bunk bed', 'crib', 'recliner',
    'chaise lounge', 'cabinet', 'chest of drawers', 'console table',
    'futon', 'hammock', 'bar stool',
  ],
  kitchen: [
    'cup', 'teapot', 'fork', 'spoon', 'knife', 'plate', 'frying pan',
    'whisk', 'rolling pin', 'cutting board', 'ladle', 'colander',
    'measuring cup', 'mixing bowl', 'saucepan', 'spatula', 'grater',
    'peeler', 'tongs', 'wok', 'mug', 'bowl', 'pitcher', 'salt shaker',
    'pepper mill', 'cookie jar', 'oven mitt', 'apron', 'cheese knife',
    'corkscrew',
  ],
  gardentools: [
    'rake', 'watering can', 'garden shovel', 'hoe', 'garden fork',
    'hedge clippers', 'lawn mower', 'garden hose', 'trowel',
  ],
  cleaning: [
    'broom', 'mop', 'bucket', 'sponge', 'spray bottle', 'feather duster',
    'dust pan', 'scrub brush',
  ],
  office: [
    'office desk', 'office chair', 'paperclip', 'pen', 'stapler',
    'calculator', 'file folder', 'sticky notes', 'binder clip', 'printer',
    'notepad', 'rubber stamp',
  ],

  // ---- school / science -------------------------------------------------
  school: [
    'pencil', 'eraser', 'notebook', 'backpack', 'ruler', 'scissors',
    'crayon', 'globe', 'chalkboard', 'protractor', 'glue stick',
    'paint brush', 'school bell', 'lunchbox', 'apple', 'book stack',
  ],
  science: [
    'test tube', 'beaker', 'microscope', 'atom symbol', 'dna helix',
    'magnifying glass', 'telescope', 'flask', 'lab goggles', 'pipette',
    'bunsen burner', 'molecule model', 'petri dish', 'lab coat', 'prism',
    'horseshoe magnet', 'battery cell', 'circuit diagram', 'scale balance',
    'syringe', 'lab funnel', 'crystal sample', 'fossil', 'skeleton model',
    'globe model', 'rocket model', 'gear cog', 'thermometer', 'stopwatch',
  ],

  // ---- tech -------------------------------------------------------------
  tech: [
    'laptop', 'desktop computer', 'smartphone', 'tablet', 'smartwatch',
    'computer mouse', 'keyboard', 'headphones', 'speaker', 'webcam',
    'usb stick', 'wifi router', 'monitor screen', 'power bank',
    'e-reader', 'projector', 'scanner', 'fitness tracker', 'earbuds',
    'hard drive', 'circuit board', 'microchip', 'antenna', 'stylus pen',
    'graphics tablet', 'security camera', 'smart bulb', 'docking station',
  ],
  gaming: [
    'game controller', 'arcade joystick', 'gaming console', 'vr headset',
    'gaming dice', 'handheld console', 'arcade machine', 'gaming mouse',
    'gaming chair', 'game cartridge', 'gaming headset', 'racing wheel',
  ],
  gadgets: [
    'camera', 'tv set', 'remote control', 'old radio', 'walkman',
    'handheld game', 'polaroid camera', 'microphone', 'flashlight',
    'calculator', 'drone camera', 'smart speaker', 'typewriter',
    'rotary phone', 'cassette tape', 'floppy disk', 'turntable',
    'fax machine', 'pager', 'doorbell camera', 'satellite phone',
    'film camera',
  ],
  retrotech: [
    'game boy', 'old television', 'vinyl record', 'boombox', 'jukebox',
    'view master', 'slide projector', 'telegraph', 'gramophone',
    'vintage radio',
  ],

  // ---- toys / games -----------------------------------------------------
  toys: [
    'teddy bear', 'doll', 'toy robot', 'yo-yo', 'rubber duck',
    'rocking horse', 'building block', 'slinky', 'spinning top', 'kite',
    'jack in the box', 'wind up car', 'toy train', 'toy drum',
    'beach pail', 'pinwheel', 'marbles', 'toy soldier', 'puppet',
    'stuffed bunny', 'action figure', 'toy car', 'toy plane', 'toy boat',
    'hula hoop', 'bouncy ball', 'jigsaw puzzle', 'nesting dolls',
    'music box', 'kaleidoscope', 'sock puppet', 'finger puppet',
    'toy phone', 'toy hammer', 'stacking rings', 'abacus', 'paddle ball',
    'water gun', 'toy sword', 'toy shield', 'plush dog', 'plush cat',
    'plush elephant', 'train set', 'race track', 'toy dinosaur',
    'snow globe', 'cuddly lion', 'wooden blocks', 'pull toy', 'spinning wheel',
    'toy truck', 'toy helicopter', 'toy rocket', 'rubber ball', 'cap gun',
    'plush teddy', 'building bricks', 'toy castle', 'toy farm', 'play tent',
    'bubble wand', 'spinning top toy', 'wind-up robot', 'pogo stick',
    'jumping jack toy', 'whistle toy', 'toy xylophone', 'play phone',
    'toy camera', 'stacking cups', 'shape sorter', 'baby rattle',
    'plush penguin', 'plush owl', 'play food', 'toy guitar',
    'jump rope toy', 'spinning carousel toy', 'toy tractor', 'toy boat',
    'toy fire engine', 'wooden puzzle', 'pop-up toy', 'ring toss',
    'toy windmill', 'beach spade', 'toy binoculars', 'plush bear',
    'plush rabbit', 'toy helicopter', 'wind-up mouse', 'glow stick',
    'toy parachute', 'spinning gyroscope',
  ],
  boardgames: [
    'chess king', 'chess knight', 'chess pawn', 'chess rook',
    'chess queen', 'chess bishop', 'domino', 'playing card', 'dice cube',
    'puzzle piece', 'checkers piece', 'go stone', 'game spinner',
    'bingo card', 'card deck', 'game board', 'pawn token', 'jigsaw box',
  ],

  // ---- instruments ------------------------------------------------------
  strings: [
    'guitar', 'violin', 'cello', 'harp', 'banjo', 'ukulele', 'sitar',
    'mandolin', 'lute', 'electric guitar', 'double bass', 'viola',
    'fiddle', 'zither', 'lyre', 'dulcimer', 'koto', 'erhu', 'shamisen',
    'charango', 'bass guitar', 'harp lute',
  ],
  wind: [
    'flute', 'clarinet', 'oboe', 'recorder', 'piccolo', 'bassoon',
    'pan flute', 'harmonica', 'bagpipes', 'ocarina', 'didgeridoo',
    'fife', 'tin whistle', 'conch shell horn', 'kazoo',
  ],
  brass: [
    'trumpet', 'trombone', 'tuba', 'french horn', 'cornet', 'bugle',
    'euphonium', 'flugelhorn', 'sousaphone', 'alphorn', 'mellophone',
  ],
  percussion: [
    'drum', 'snare drum', 'tambourine', 'maracas', 'xylophone',
    'triangle instrument', 'cymbal', 'bongo drum', 'gong', 'conga drum',
    'timpani', 'marimba', 'cowbell', 'castanets', 'glockenspiel',
    'steel drum', 'djembe', 'tabla', 'vibraphone', 'wind chimes',
    'woodblock', 'claves', 'rainstick', 'handbell', 'kalimba',
    'taiko drum', 'bass drum',
  ],
  keyboards: [
    'piano', 'grand piano', 'pipe organ', 'accordion', 'harpsichord',
    'synthesizer', 'keytar', 'melodica', 'clavichord', 'celesta',
    'electric piano',
  ],
  musicstuff: [
    'microphone', 'music note', 'treble clef', 'sheet music', 'metronome',
    'tuning fork', 'amplifier', 'headphones', 'conductor baton',
    'music stand', 'speaker box', 'vinyl record', 'cassette tape',
    'guitar pick', 'drumsticks',
  ],
  folkinstruments: [
    'pan pipes', 'jaw harp', 'washboard', 'spoons instrument', 'bodhran',
    'hurdy gurdy', 'concertina', 'autoharp', 'bouzouki', 'balalaika',
    'mbira', 'steelpan', 'tambura', 'nyckelharpa',
  ],

  // ---- shapes / symbols -------------------------------------------------
  shapes: [
    'star', 'heart', 'circle', 'triangle', 'square', 'diamond',
    'crescent moon', 'lightning bolt', 'cross', 'arrow', 'spiral',
    'hexagon', 'pentagon', 'octagon', 'oval', 'rectangle', 'cloud shape',
    'teardrop', 'ring shape', 'cube', 'pyramid shape', 'cone', 'cylinder',
    'sphere', 'crescent', 'star burst', 'rounded square', 'parallelogram',
    'trapezoid', 'rhombus', 'five-point star', 'six-point star',
    'half circle', 'quarter circle', 'chevron', 'zigzag', 'wave shape',
    'plus sign', 'check mark', 'heptagon', 'nonagon', 'decagon',
    'eight-point star', 'four-point star', 'double triangle', 'arch shape',
    'kite shape', 'pinwheel shape', 'gear shape', 'shield shape',
    'banner shape', 'speech bubble', 'thought bubble', 'flower shape',
    'puzzle shape', 'leaf outline', 'egg shape', 'lens shape',
    'crescent ring', 'star outline',
  ],
  symbols: [
    'crown', 'key', 'anchor', 'feather', 'leaf symbol', 'flame', 'snowflake',
    'sun symbol', 'moon symbol', 'shield', 'gear', 'bell', 'gift box',
    'balloon', 'flag', 'light bulb', 'paw print', 'puzzle piece',
    'infinity symbol', 'music note', 'peace sign', 'smiley face',
    'lightning symbol', 'water drop symbol', 'star symbol', 'heart symbol',
    'arrow symbol', 'compass rose', 'hourglass', 'magnet', 'padlock',
    'umbrella symbol', 'ribbon', 'medal symbol', 'trophy symbol',
    'crown symbol', 'eye symbol', 'hand symbol', 'footprint', 'sword symbol',
    'wing symbol', 'crescent symbol', 'cog symbol', 'target symbol',
    'diamond gem', 'lantern', 'scroll', 'quill pen', 'hourglass timer',
    'treasure key', 'arrow up', 'arrow down', 'recycle symbol',
    'wifi symbol', 'battery symbol', 'bookmark', 'price tag', 'gift bow',
    'lightning flash', 'four leaf clover', 'horseshoe',
  ],

  // ---- seasons / holidays ----------------------------------------------
  summer: [
    'beach ball', 'ice cream cone', 'sunglasses', 'flip flop', 'palm tree',
    'surfboard', 'watermelon slice', 'sun', 'beach umbrella', 'sandcastle',
    'popsicle', 'pool float', 'sun hat', 'lemonade', 'seashell',
  ],
  spring: [
    'tulip', 'butterfly', 'kite', 'umbrella', 'rainbow', 'rain boots',
    'bee', 'ladybug', 'cherry blossom', 'baby chick', 'bird nest',
    'flower bud', 'watering can', 'green sprout',
  ],
  autumn: [
    'autumn leaf', 'pumpkin', 'acorn', 'scarecrow', 'apple', 'rake',
    'pinecone', 'maple leaf', 'corn cob', 'hay bale', 'mushroom',
    'wheat bundle',
  ],
  winterseason: [
    'snowflake', 'snowman', 'mittens', 'sled', 'snowboard',
    'hot chocolate mug', 'ice skate', 'winter scarf', 'icicle',
    'snow globe', 'woolly hat', 'frozen pond',
  ],
  easter: [
    'easter egg', 'easter bunny', 'easter basket', 'baby chick',
    'painted egg', 'easter lily', 'spring lamb', 'carrot',
  ],
  valentines: [
    'love heart', 'red rose', 'cupid', 'chocolate box', 'love letter',
    'arrow through heart', 'valentine teddy bear', 'heart balloon',
  ],
  thanksgiving: [
    'turkey bird', 'pumpkin', 'cornucopia', 'pilgrim hat', 'corn cob',
    'autumn leaf', 'pumpkin pie', 'wheat bundle',
  ],
  birthday: [
    'birthday cake', 'balloon', 'gift box', 'party hat', 'confetti',
    'birthday candle', 'streamer', 'party popper',
  ],
  newyear: [
    'fireworks', 'champagne bottle', 'party clock', 'party popper',
    'noisemaker', 'sparkler', 'disco ball', 'celebration banner',
  ],
  christmas: [
    'christmas tree', 'santa claus', 'snowman', 'reindeer',
    'gingerbread man', 'candy cane', 'gift box', 'snowflake',
    'christmas bell', 'wreath', 'christmas stocking', 'ornament ball',
    'sleigh', 'elf', 'star topper',
  ],
  halloween: [
    'pumpkin', 'ghost', 'spooky bat', 'spider', 'witch hat', 'skull',
    'black cat', 'candy', 'haunted house', 'spooky tree', 'tombstone',
    'cauldron', 'spider web', 'candy bucket',
  ],

  // ---- characters -------------------------------------------------------
  pirates: [
    'pirate', 'pirate ship', 'pirate hat', 'treasure chest', 'pirate parrot',
    'cutlass sword', 'spyglass', 'jolly roger flag', 'cannonball', 'anchor',
    'treasure map', 'message bottle',
  ],
  knights: [
    'knight in armor', 'shield', 'sword', 'lance', 'knight helmet',
    'crossbow', 'battle axe', 'jousting horse', 'castle gate',
  ],
  princesses: [
    'princess', 'tiara', 'fairy', 'magic wand', 'glass slipper',
    'jewelry box', 'royal carriage', 'castle tower',
  ],
  wizards: [
    'wizard', 'wizard hat', 'magic wand', 'spell book', 'potion bottle',
    'cauldron', 'crystal ball', 'magic broom',
  ],

  // ---- travel -----------------------------------------------------------
  travel: [
    'suitcase', 'passport', 'world map', 'compass', 'travel camera',
    'travel mug', 'sun hat', 'guidebook', 'backpack', 'binoculars',
    'plane ticket', 'globe',
  ],
  camping: [
    'tent', 'campfire', 'sleeping bag', 'hiking boot', 'camp backpack',
    'lantern', 'camp compass', 'thermos', 'pocket knife', 'fishing rod',
    'marshmallow stick', 'camp stove',
  ],
  beach: [
    'beach umbrella', 'sandcastle', 'palm tree', 'surfboard',
    'ice cream cone', 'seashell', 'sand bucket', 'beach ball', 'flip flop',
    'snorkel', 'starfish', 'beach towel',
  ],

  // ---- misc -------------------------------------------------------------
  money: [
    'coin', 'dollar bill', 'credit card', 'piggy bank', 'wallet',
    'gold bar', 'safe', 'cash register', 'money bag',
  ],
  circus: [
    'clown', 'circus tent', 'juggling pin', 'unicycle', 'ringmaster',
    'elephant on ball', 'lion tamer', 'tightrope walker', 'cotton candy',
    'circus seal',
  ],
  movies: [
    'popcorn bucket', 'film reel', 'movie clapper', 'cinema seat',
    '3d glasses', 'ticket stub', 'old projector',
  ],
};

// keyword (singular / plural / synonym) -> category key
const SYNONYMS: Record<string, string> = {
  animal: 'animals', animals: 'animals', creature: 'animals',
  creatures: 'animals', pet: 'petanimals', pets: 'petanimals',
  wildlife: 'animals',
  dog: 'dogs', dogs: 'dogs', puppy: 'dogs', puppies: 'dogs',
  cat: 'cats', cats: 'cats', kitten: 'cats', kitty: 'cats',
  bird: 'birds', birds: 'birds',
  fish: 'sea', sea: 'sea', ocean: 'sea', 'sea animal': 'sea',
  'sea animals': 'sea', 'sea creature': 'sea', 'sea creatures': 'sea',
  marine: 'sea', 'ocean animals': 'sea', underwater: 'sea',
  insect: 'insects', insects: 'insects', bug: 'insects', bugs: 'insects',
  dinosaur: 'dinosaurs', dinosaurs: 'dinosaurs', dino: 'dinosaurs',
  dinos: 'dinosaurs',
  fruit: 'fruits', fruits: 'fruits',
  vegetable: 'vegetables', vegetables: 'vegetables', veggie: 'vegetables',
  veggies: 'vegetables', veg: 'vegetables',
  food: 'food', foods: 'food',
  vehicle: 'vehicles', vehicles: 'vehicles', transport: 'vehicles',
  transportation: 'vehicles',
  space: 'space', 'outer space': 'space', astronomy: 'space',
  sport: 'sports', sports: 'sports',
  instrument: 'instruments', instruments: 'instruments',
  'musical instruments': 'instruments', music: 'instruments',
  flower: 'flowers', flowers: 'flowers', plant: 'plants',
  plants: 'plants',
  mythical: 'mythical', myth: 'mythical', fantasy: 'mythical',
  legend: 'mythical', legends: 'mythical',
  halloween: 'halloween', spooky: 'halloween',
  christmas: 'christmas', xmas: 'christmas', holiday: 'christmas',
  tool: 'tools', tools: 'tools',
  job: 'jobs', jobs: 'jobs', profession: 'jobs', professions: 'jobs',
  occupation: 'jobs', occupations: 'jobs', career: 'jobs',
  careers: 'jobs', work: 'jobs', worker: 'jobs', workers: 'jobs',
  monster: 'monsters', monsters: 'monsters',
  robot: 'robots', robots: 'robots', machine: 'robots',
  machines: 'robots', bot: 'robots', bots: 'robots',
  weather: 'weather',
  building: 'buildings', buildings: 'buildings',
  architecture: 'buildings', place: 'buildings', places: 'buildings',
  clothes: 'clothing', clothing: 'clothing', outfit: 'clothing',
  fashion: 'clothing', apparel: 'clothing',
  kitchen: 'kitchen', kitchenware: 'kitchen', utensil: 'kitchen',
  utensils: 'kitchen', cookware: 'kitchen',
  nature: 'nature', landscape: 'nature', scenery: 'nature',
  reptile: 'reptiles', reptiles: 'reptiles',
  farm: 'farm', 'farm animal': 'farm', 'farm animals': 'farm',
  jungle: 'jungle', 'jungle animals': 'jungle', safari: 'jungle',
  shape: 'shapes', shapes: 'shapes', geometry: 'shapes',
  symbol: 'symbols', symbols: 'symbols', icons: 'symbols',
  dessert: 'desserts', desserts: 'desserts', sweets: 'desserts',
  cake: 'desserts', cakes: 'desserts', sweet: 'desserts',
  bakery: 'bakery', bread: 'bakery', breads: 'bakery', pastry: 'bakery',
  pastries: 'bakery',
  breakfast: 'breakfast', brunch: 'breakfast',
  snack: 'snacks', snacks: 'snacks',
  drink: 'drinks', drinks: 'drinks', beverage: 'drinks', beverages: 'drinks',
  'fast food': 'fastfood', fastfood: 'fastfood', takeout: 'fastfood',
  candy: 'candies', candies: 'candies',
  'world food': 'worldfoods', 'world foods': 'worldfoods',
  international: 'worldfoods', cuisine: 'worldfoods',
  arctic: 'arctic', 'arctic animals': 'arctic', polar: 'arctic',
  desert: 'desert', 'desert animals': 'desert',
  forest: 'forest', 'forest animals': 'forest', woodland: 'forest',
  pond: 'pond', 'pond animals': 'pond',
  'big cat': 'bigcats', 'big cats': 'bigcats', bigcats: 'bigcats',
  felines: 'bigcats',
  bear: 'bears', bears: 'bears',
  rodent: 'rodents', rodents: 'rodents',
  amphibian: 'amphibians', amphibians: 'amphibians',
  nocturnal: 'nocturnal',
  songbird: 'songbirds', songbirds: 'songbirds',
  'birds of prey': 'birdsofprey', raptors: 'birdsofprey',
  waterfowl: 'waterfowl',
  'tropical birds': 'tropicalbirds', 'tropical bird': 'tropicalbirds',
  car: 'cars', cars: 'cars',
  plane: 'planes', planes: 'planes', aircraft: 'planes',
  boat: 'boats', boats: 'boats', ships: 'boats', ship: 'boats',
  train: 'trains', trains: 'trains',
  truck: 'trucks', trucks: 'trucks',
  emergency: 'emergencyvehicles',
  'emergency vehicles': 'emergencyvehicles',
  construction: 'construction',
  'construction vehicles': 'construction',
  military: 'military', 'military vehicles': 'military',
  bike: 'bikes', bikes: 'bikes', bicycles: 'bikes',
  hat: 'hats', hats: 'hats',
  shoe: 'shoes', shoes: 'shoes', footwear: 'shoes',
  accessory: 'accessories', accessories: 'accessories',
  house: 'houses', houses: 'houses', home: 'houses', homes: 'houses',
  landmark: 'landmarks', landmarks: 'landmarks', monuments: 'landmarks',
  planet: 'planets', planets: 'planets', 'solar system': 'planets',
  celestial: 'celestial', cosmos: 'space', galaxy: 'celestial',
  pirate: 'pirates', pirates: 'pirates',
  knight: 'knights', knights: 'knights', medieval: 'knights',
  princess: 'princesses', princesses: 'princesses', royal: 'princesses',
  wizard: 'wizards', wizards: 'wizards', magic: 'wizards',
  easter: 'easter',
  valentine: 'valentines', valentines: 'valentines', love: 'valentines',
  thanksgiving: 'thanksgiving',
  birthday: 'birthday', birthdays: 'birthday', party: 'birthday',
  'new year': 'newyear', newyear: 'newyear',
  summer: 'summer',
  spring: 'spring',
  autumn: 'autumn', fall: 'autumn',
  winter: 'winterseason', 'winter season': 'winterseason',
  toy: 'toys', toys: 'toys',
  game: 'boardgames', games: 'boardgames', 'board games': 'boardgames',
  tech: 'tech', technology: 'tech', electronics: 'tech',
  computer: 'tech', computers: 'tech',
  gaming: 'gaming', videogames: 'gaming', 'video games': 'gaming',
  gadget: 'gadgets', gadgets: 'gadgets',
  bedroom: 'bedroom',
  bathroom: 'bathroom',
  appliance: 'appliances', appliances: 'appliances',
  furniture: 'furniture',
  garden: 'gardentools', 'garden tools': 'gardentools',
  gardening: 'gardentools',
  cleaning: 'cleaning',
  office: 'office', stationery: 'office',
  school: 'school', classroom: 'school',
  science: 'science', biology: 'science', chemistry: 'science',
  travel: 'travel', vacation: 'travel', tourism: 'travel',
  camping: 'camping', outdoor: 'camping', outdoors: 'camping',
  beach: 'beach',
  money: 'money', cash: 'money', finance: 'money',
  circus: 'circus',
  movies: 'movies', cinema: 'movies', film: 'movies', films: 'movies',
};

/** Categories pull from related sub-pools so each clears 101 subjects. */
const EXTENDS: Record<string, string[]> = {
  // --- ANIMAL DOMAIN ---------------------------------------------------
  animals: [
    'petanimals', 'dogs', 'cats', 'wildcats', 'bigcats', 'bears',
    'primates', 'hoofed', 'smallmammals', 'wildcanines', 'marsupials',
    'rodents', 'nocturnal', 'arctic', 'desert', 'forest', 'jungle', 'farm',
    'pond', 'birds', 'sea', 'insects', 'reptiles', 'amphibians',
    'dinosaurs', 'prehistoric',
  ],
  dogs: [],
  cats: ['wildcats', 'bigcats'],
  wildcats: ['cats', 'bigcats'],
  bigcats: ['cats', 'wildcats'],
  petanimals: ['animals'], bears: ['animals'], primates: ['animals'],
  hoofed: ['animals'], smallmammals: ['animals'], wildcanines: ['animals'],
  marsupials: ['animals'], rodents: ['animals'], nocturnal: ['animals'],
  arctic: ['animals'], desert: ['animals'], forest: ['animals'],
  jungle: ['animals'], farm: ['animals'], pond: ['animals'],
  birds: [
    'songbirds', 'birdsofprey', 'waterfowl', 'tropicalbirds',
    'flightlessbirds', 'commonbirds', 'shorebirds', 'morebirds',
  ],
  songbirds: ['birds'], birdsofprey: ['birds'], waterfowl: ['birds'],
  tropicalbirds: ['birds'], flightlessbirds: ['birds'],
  commonbirds: ['birds'], shorebirds: ['birds'], morebirds: ['birds'],
  sea: [
    'fish', 'sharks', 'marinemammals', 'shellfish', 'cephalopods',
    'reefcreatures', 'morefish', 'shellcreatures', 'moresealife',
  ],
  fish: ['sea'], sharks: ['sea'], marinemammals: ['sea'], shellfish: ['sea'],
  cephalopods: ['sea'], reefcreatures: ['sea'], morefish: ['sea'],
  shellcreatures: ['sea'], moresealife: ['sea'],
  insects: [
    'insectsbase', 'arachnids', 'crawlies', 'moreinsects', 'butterflies',
    'beetles',
  ],
  insectsbase: ['insects'], arachnids: ['insects'], crawlies: ['insects'],
  moreinsects: ['insects'], butterflies: ['insects'], beetles: ['insects'],
  reptiles: ['amphibians', 'dinosaurs', 'prehistoric'],
  amphibians: ['reptiles', 'dinosaurs', 'prehistoric'],
  dinosaurs: ['reptiles', 'amphibians', 'prehistoric'],
  prehistoric: ['dinosaurs', 'reptiles', 'amphibians'],
  // --- FOOD DOMAIN -----------------------------------------------------
  food: [
    'fruits', 'vegetables', 'desserts', 'bakery', 'breakfast', 'snacks',
    'drinks', 'fastfood', 'candies', 'worldfoods', 'dairyeggs',
  ],
  fruits: ['food'], vegetables: ['food'], desserts: ['food'],
  bakery: ['food'], breakfast: ['food'], snacks: ['food'], drinks: ['food'],
  fastfood: ['food'], candies: ['food'], worldfoods: ['food'],
  dairyeggs: ['food'],
  // --- VEHICLE DOMAIN --------------------------------------------------
  vehicles: [
    'cars', 'trucks', 'planes', 'helicopters', 'boats', 'trains', 'bikes',
    'emergencyvehicles', 'construction', 'military', 'spacevehicles',
    'othervehicles',
  ],
  cars: ['vehicles'], trucks: ['vehicles'], planes: ['vehicles'],
  helicopters: ['vehicles'], boats: ['vehicles'], trains: ['vehicles'],
  bikes: ['vehicles'], emergencyvehicles: ['vehicles'],
  construction: ['vehicles'], military: ['vehicles'],
  spacevehicles: ['vehicles'], othervehicles: ['vehicles'],
  // --- NATURE DOMAIN ---------------------------------------------------
  nature: [
    'flowers', 'trees', 'plants', 'cacti', 'mushroomslist', 'foliage',
    'mountains', 'waterfeatures', 'weather', 'sky', 'gemstones', 'landforms',
  ],
  flowers: ['plants', 'trees', 'cacti', 'mushroomslist', 'foliage'],
  plants: ['flowers', 'trees', 'cacti', 'mushroomslist', 'foliage'],
  trees: ['flowers', 'plants', 'cacti', 'mushroomslist', 'foliage'],
  cacti: ['flowers', 'plants', 'trees', 'mushroomslist', 'foliage'],
  mushroomslist: ['flowers', 'plants', 'trees', 'cacti', 'foliage'],
  foliage: ['flowers', 'plants', 'trees', 'cacti', 'mushroomslist'],
  mountains: ['nature'], waterfeatures: ['nature'], landforms: ['nature'],
  gemstones: ['nature'], weather: ['nature'], sky: ['nature'],
  // --- SPORTS DOMAIN ---------------------------------------------------
  sports: [
    'ballsports', 'racketsports', 'wintersports', 'watersports', 'gym',
    'extreme', 'sportsgear', 'teamsports', 'athletics', 'martialarts',
    'sportsmisc',
  ],
  ballsports: ['sports'], racketsports: ['sports'], wintersports: ['sports'],
  watersports: ['sports'], gym: ['sports'], extreme: ['sports'],
  sportsgear: ['sports'], teamsports: ['sports'], athletics: ['sports'],
  martialarts: ['sports'], sportsmisc: ['sports'],
  // --- BUILDINGS DOMAIN ------------------------------------------------
  buildings: [
    'houses', 'landmarks', 'religious', 'modernbuildings', 'historic',
    'structures', 'homestyles',
  ],
  houses: ['buildings'], landmarks: ['buildings'], religious: ['buildings'],
  modernbuildings: ['buildings'], historic: ['buildings'],
  structures: ['buildings'], homestyles: ['buildings'],
  // --- CLOTHING DOMAIN -------------------------------------------------
  clothing: [
    'tops', 'bottoms', 'outerwear', 'hats', 'shoes', 'accessories',
    'swimwear', 'formalwear',
  ],
  tops: ['clothing'], bottoms: ['clothing'], outerwear: ['clothing'],
  hats: ['clothing'], shoes: ['clothing'], accessories: ['clothing'],
  swimwear: ['clothing'], formalwear: ['clothing'],
  // --- SPACE DOMAIN ----------------------------------------------------
  space: [
    'planets', 'celestial', 'spacecraft', 'spacepeople', 'spacestuff',
    'astronomy', 'scifi', 'robots',
  ],
  planets: ['space'], celestial: ['space'], spacecraft: ['space'],
  spacepeople: ['space'], spacestuff: ['space'], astronomy: ['space'],
  scifi: ['space'], robots: ['space'],
  // --- INSTRUMENTS DOMAIN ----------------------------------------------
  instruments: [
    'strings', 'wind', 'brass', 'percussion', 'keyboards', 'musicstuff',
    'folkinstruments',
  ],
  strings: ['instruments'], wind: ['instruments'], brass: ['instruments'],
  percussion: ['instruments'], keyboards: ['instruments'],
  musicstuff: ['instruments'], folkinstruments: ['instruments'],
  // --- FANTASY DOMAIN --------------------------------------------------
  mythical: ['monsters', 'wizards', 'princesses', 'knights'],
  monsters: ['mythical', 'wizards', 'knights'],
  wizards: ['mythical', 'monsters', 'princesses'],
  princesses: ['mythical', 'wizards', 'monsters'],
  knights: ['mythical', 'monsters', 'wizards'],
  // --- JOBS (self-sufficient) ------------------------------------------
  jobs: [],
  // --- HOUSEHOLD / TOOLS DOMAIN ----------------------------------------
  tools: ['kitchen', 'appliances', 'furniture', 'bedroom', 'bathroom', 'office', 'cleaning', 'gardentools'],
  kitchen: ['tools', 'appliances', 'furniture', 'bedroom', 'bathroom', 'office', 'cleaning', 'gardentools'],
  appliances: ['tools', 'kitchen', 'furniture', 'bedroom', 'bathroom', 'office', 'cleaning', 'gardentools'],
  furniture: ['tools', 'kitchen', 'appliances', 'bedroom', 'bathroom', 'office', 'cleaning', 'gardentools'],
  bedroom: ['tools', 'kitchen', 'appliances', 'furniture', 'bathroom', 'office', 'cleaning', 'gardentools'],
  bathroom: ['tools', 'kitchen', 'appliances', 'furniture', 'bedroom', 'office', 'cleaning', 'gardentools'],
  office: ['tools', 'kitchen', 'appliances', 'furniture', 'bedroom', 'bathroom', 'cleaning', 'gardentools'],
  cleaning: ['tools', 'kitchen', 'appliances', 'furniture', 'bedroom', 'bathroom', 'office', 'gardentools'],
  gardentools: ['tools', 'kitchen', 'appliances', 'furniture', 'bedroom', 'bathroom', 'office', 'cleaning'],
  // --- TECH / LEARNING DOMAIN ------------------------------------------
  tech: ['gadgets', 'gaming', 'retrotech', 'science', 'school', 'boardgames', 'movies', 'money'],
  gadgets: ['tech', 'gaming', 'retrotech', 'science', 'school', 'boardgames', 'movies', 'money'],
  gaming: ['tech', 'gadgets', 'retrotech', 'science', 'school', 'boardgames', 'movies', 'money'],
  retrotech: ['tech', 'gadgets', 'gaming', 'science', 'school', 'boardgames', 'movies', 'money'],
  science: ['tech', 'gadgets', 'gaming', 'retrotech', 'school', 'boardgames', 'movies', 'money'],
  school: ['tech', 'gadgets', 'gaming', 'retrotech', 'science', 'boardgames', 'movies', 'money'],
  movies: ['tech', 'gadgets', 'gaming', 'retrotech', 'science', 'school', 'boardgames', 'money'],
  money: ['tech', 'gadgets', 'gaming', 'retrotech', 'science', 'school', 'boardgames', 'movies'],
  // --- TOYS ------------------------------------------------------------
  toys: ['boardgames'],
  boardgames: ['toys'],
  // --- SHAPES ----------------------------------------------------------
  shapes: ['symbols'],
  symbols: ['shapes'],
  // --- SEASONAL / HOLIDAY (aggregators, intentionally broad) -----------
  summer: ['beach', 'waterfeatures'],
  spring: ['flowers', 'insects', 'songbirds'],
  autumn: ['forest', 'trees', 'vegetables', 'foliage'],
  winterseason: ['arctic', 'wintersports', 'christmas', 'weather'],
  christmas: ['toys', 'winterseason', 'candies', 'desserts'],
  halloween: ['monsters', 'mythical', 'nocturnal', 'autumn'],
  easter: ['spring', 'flowers'],
  valentines: ['flowers', 'candies', 'desserts', 'bakery'],
  thanksgiving: ['autumn', 'vegetables', 'food'],
  birthday: ['toys', 'desserts', 'candies', 'bakery'],
  newyear: ['birthday', 'toys', 'celestial'],
  // --- ACTIVITY / CHARACTER aggregators --------------------------------
  travel: ['vehicles', 'landmarks', 'camping'],
  camping: ['nature', 'forest'],
  beach: ['sea', 'summer'],
  pirates: ['sea'],
  circus: ['toys', 'bigcats', 'instruments'],
};

const poolCache = new Map<string, string[]>();

function poolFor(category: string): string[] {
  const cached = poolCache.get(category);
  if (cached) return cached;
  const seen = new Set<string>();
  const out: string[] = [];
  const visited = new Set<string>();
  const walk = (k: string) => {
    if (visited.has(k)) return;
    visited.add(k);
    for (const s of CATEGORIES[k] ?? []) {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
    }
    for (const ext of EXTENDS[k] ?? []) walk(ext);
  };
  walk(category);
  poolCache.set(category, out);
  return out;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cacheKey = '';
let cacheOrder: number[] = [];

export function resolveCategory(keyword: string): string | null {
  const n = keyword.trim().toLowerCase();
  if (CATEGORIES[n]) return n;
  if (SYNONYMS[n]) return SYNONYMS[n];
  if (SYNONYMS[n.replace(/s$/, '')]) return SYNONYMS[n.replace(/s$/, '')];
  return null;
}

/** Pose & style modifiers used once the unioned pool is exhausted so the
 *  same subject still produces visibly different shapes across laps.
 *  Combining 15 poses × 14 styles = 210 modifier combos guarantees ≥200
 *  unique prompts for any keyword, including a single-noun unknown one. */
const POSES = [
  'running',
  'jumping',
  'sleeping',
  'sitting',
  'standing',
  'dancing',
  'flying',
  'swimming',
  'eating',
  'smiling',
  'looking up',
  'side view',
  'front view',
  'from above',
  'curled up',
];
const STYLES = [
  'big',
  'tiny',
  'fluffy',
  'cute',
  'fierce',
  'sleepy',
  'happy',
  'angry',
  'friendly',
  'cartoon',
  'chibi',
  'simple',
  'bold',
  'baby',
];

/**
 * The concrete subject for maze `index`. For a known category this walks a
 * per-book shuffled pool that unions related categories, so a 100-maze
 * "animals" book stays varied. After the pool is exhausted (lap > 0) a
 * pose modifier is appended so repeats still look different.
 * Unknown keywords pass through.
 */
function shuffledPool(
  keyword: string,
  seed: number,
): { pool: string[]; order: number[] } {
  const cat = resolveCategory(keyword);
  const pool = cat ? poolFor(cat) : [keyword.trim()];
  const key = `${cat ?? `__lit:${keyword.trim()}`}:${seed}`;
  if (cacheKey !== key) {
    const order = pool.map((_, i) => i);
    const rng = mulberry32(seed || 1);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    cacheOrder = order;
    cacheKey = key;
  }
  return { pool, order: cacheOrder };
}

/** Clean subject for display + icon lookup — never carries modifiers. */
export function baseSubjectFor(
  keyword: string,
  index: number,
  seed: number,
): string {
  const { pool, order } = shuffledPool(keyword, seed);
  return pool[order[index % pool.length]];
}

/** Title-friendly subject; carries a tag past the base pool so two slots
 *  with the same underlying subject still produce different titles. */
export function displaySubjectFor(
  keyword: string,
  index: number,
  seed: number,
): string {
  const { pool, order } = shuffledPool(keyword, seed);
  const base = pool[order[index % pool.length]];
  const lap = Math.floor(index / pool.length);
  if (lap === 0) return base;
  const m = lap - 1;
  const pose = POSES[m % POSES.length];
  const style = STYLES[Math.floor(m / POSES.length) % STYLES.length];
  return `${base} (${style} ${pose})`.replace(/\s+/g, ' ').trim();
}

/** Full AI prompt string (may include pose + style for variation). */
export function subjectFor(
  keyword: string,
  index: number,
  seed: number,
): string {
  const { pool, order } = shuffledPool(keyword, seed);
  const subject = pool[order[index % pool.length]];
  const lap = Math.floor(index / pool.length);
  if (lap === 0) return subject;
  // pool × pose × style yields ≥ 200 unique strings for every keyword
  const m = lap - 1;
  const pose = POSES[m % POSES.length];
  const style = STYLES[Math.floor(m / POSES.length) % STYLES.length];
  return `${style} ${subject} ${pose}`.replace(/\s+/g, ' ').trim();
}
