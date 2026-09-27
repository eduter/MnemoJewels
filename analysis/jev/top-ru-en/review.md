# Jev triage review

Deck: top-ru-en  
Endpoint: https://jevtypesafeai.com/api/v1/decide  
Model: jev-latest

Evaluated 11084 cards. 10842 are settled by the threshold; 
242 across 98 lemmas need a closer look.

Thresholds: drop when misleading >= 0.5; review band +/-undefined; ambiguous best-pick below 0.6; low usefulness below 0.4.

## Drop empties the lemma entirely (242)

| front | back | decision | misleading | usefulness | reason | siblings |
| --- | --- | --- | --- | --- | --- | --- |
| важно | grandly | drop | 0.980 | 0.97 | lemma-emptied | importantly |
| себе | keep on | drop | 0.980 | 0.01 | lemma-emptied |  |
| завтракать | lunch | drop | 0.980 | 0.95 | lemma-emptied | breakfast |
| та | internet | drop | 0.980 | 0.08 | lemma-emptied | ukrainian |
| полька | noise | drop | 0.980 | 0.98 | lemma-emptied | female, pole, polish, woman, military, reduced, mortar |
| дискотека | library | drop | 0.980 | 0.66 | lemma-emptied | record, event, evening, music, dance |
| нелегко | easy | drop | 0.980 | 0.83 | lemma-emptied | not, easily, difficulty |
| прилетать | abruptly | drop | 0.980 | 1.16 | lemma-emptied | aviation, land, touch down, descend, soil, swiftly |
| неизвестно | known | drop | 0.980 | 0.01 | lemma-emptied |  |
| тройка | trowsers | drop | 0.980 | 1.49 | lemma-emptied | three, card game, trey, troika, vest, jacket |
| тройка | vest | drop | 0.980 | 1.49 | lemma-emptied | three, card game, trey, troika, trowsers, jacket |
| откуда | which | drop | 0.970 | 1.14 | lemma-emptied | whence, from, where |
| чайный | colored | drop | 0.970 | 0.96 | lemma-emptied | tea, scented |
| полька | reduced | drop | 0.970 | 0.98 | lemma-emptied | female, pole, polish, woman, military, noise, mortar |
| неплохо | badly | drop | 0.970 | 0.01 | lemma-emptied |  |
| газовый | gauze | drop | 0.970 | 0.87 | lemma-emptied | gas |
| недолго | long | drop | 0.970 | 0.14 | lemma-emptied | easily |
| дискотека | evening | drop | 0.970 | 0.66 | lemma-emptied | record, library, event, music, dance |
| прилетать | aviation | drop | 0.970 | 1.16 | lemma-emptied | land, touch down, descend, soil, swiftly, abruptly |
| прилетать | swiftly | drop | 0.970 | 1.16 | lemma-emptied | aviation, land, touch down, descend, soil, abruptly |
| приставка | linguistic | drop | 0.970 | 1.02 | lemma-emptied | morphology, lexicography, grammar, video game, console |
| приставка | lexicography | drop | 0.970 | 1.02 | lemma-emptied | linguistic, morphology, grammar, video game, console |
| переспрашивать | a | drop | 0.970 | 1.01 | lemma-emptied | ask, again, repeat |
| тройка | jacket | drop | 0.970 | 1.49 | lemma-emptied | three, card game, trey, troika, trowsers, vest |
| пополам | all the same | drop | 0.970 | 0.07 | lemma-emptied | two, matter |
| пополам | matter | drop | 0.970 | 0.07 | lemma-emptied | two, all the same |
| та | ukrainian | drop | 0.960 | 0.08 | lemma-emptied | internet |
| полька | military | drop | 0.960 | 0.98 | lemma-emptied | female, pole, polish, woman, reduced, noise, mortar |
| эта | eta | drop | 0.960 | 0.07 | lemma-emptied |  |
| дискотека | record | drop | 0.960 | 0.66 | lemma-emptied | library, event, evening, music, dance |
| нелегко | easily | drop | 0.960 | 0.83 | lemma-emptied | not, difficulty, easy |
| приставка | grammar | drop | 0.960 | 1.02 | lemma-emptied | linguistic, morphology, lexicography, video game, console |
| согласный | phonetics | drop | 0.950 | 1.54 | lemma-emptied | ready, willing, agreeable, harmonious, concordant, consonantic, consonantal |
| недолго | easily | drop | 0.950 | 0.14 | lemma-emptied | long |
| приставка | morphology | drop | 0.950 | 1.02 | lemma-emptied | linguistic, lexicography, grammar, video game, console |
| телевизионный | tele- | drop | 0.940 | 1.02 | lemma-emptied | tv, television |
| теракт | terrorist | drop | 0.940 | 0.97 | lemma-emptied | act, terrorism, terror |
| разве | only | drop | 0.930 | 0.92 | lemma-emptied | really, perhaps, unless |
| игровой | acting | drop | 0.930 | 0.77 | lemma-emptied | game, play, playing |
| обучаться | get | drop | 0.930 | 0.94 | lemma-emptied | trained, receive, training |
| долго | time | drop | 0.920 | 0.13 | lemma-emptied |  |
| замолчать | conceal | drop | 0.920 | 0.82 | lemma-emptied | silent |
| горный | rock | drop | 0.920 | 0.98 | lemma-emptied | mountain, mining |
| цент | cent | drop | 0.920 | 0.26 | lemma-emptied |  |
| ту | train | drop | 0.910 | 0.21 | lemma-emptied | horn |
| полька | pole | drop | 0.910 | 0.98 | lemma-emptied | female, polish, woman, military, reduced, noise, mortar |
| полкило | kilo | drop | 0.910 | 0.95 | lemma-emptied | half |
| ничего | that's | drop | 0.910 | 0.82 | lemma-emptied | so-so, not bad, fair, never mind, all right, no problem |
| сбоку | askance | drop | 0.910 | 0.94 | lemma-emptied | side |
| пополам | two | drop | 0.910 | 0.07 | lemma-emptied | all the same, matter |
| обучаться | receive | drop | 0.910 | 0.94 | lemma-emptied | get, trained, training |
| засыпать | into | drop | 0.900 | 0.92 | lemma-emptied | fill, cover, bury, engulf, pour, strew, bombard |
| чайный | scented | drop | 0.900 | 0.96 | lemma-emptied | tea, colored |
| ту | horn | drop | 0.900 | 0.21 | lemma-emptied | train |
| полька | mortar | drop | 0.900 | 0.98 | lemma-emptied | female, pole, polish, woman, military, reduced, noise |
| ничего | fair | drop | 0.900 | 0.82 | lemma-emptied | so-so, not bad, never mind, that's, all right, no problem |
| партийный | member | drop | 0.900 | 1.13 | lemma-emptied | politics, party, loyal, party line |
| теракт | act | drop | 0.900 | 0.97 | lemma-emptied | terrorism, terror, terrorist |
| бы | conditional | drop | 0.890 | 0.36 | lemma-emptied | subjunctive |
| дискотека | music | drop | 0.890 | 0.66 | lemma-emptied | record, library, event, evening, dance |
| рыбный | fishful | drop | 0.890 | 0.65 | lemma-emptied | fish, fish-filled |
| нелегко | not | drop | 0.890 | 0.83 | lemma-emptied | easily, difficulty, easy |
| засыпать | bombard | drop | 0.880 | 0.92 | lemma-emptied | fill, cover, bury, engulf, pour, into, strew |
| немка | girl | drop | 0.880 | 1.04 | lemma-emptied | german, woman |
| тем | the | drop | 0.880 | 0.33 | lemma-emptied |  |
| бы | subjunctive | drop | 0.870 | 0.36 | lemma-emptied | conditional |
| подъезжать | get | drop | 0.870 | 1.01 | lemma-emptied | drive, drop in |
| прилетать | soil | drop | 0.870 | 1.16 | lemma-emptied | aviation, land, touch down, descend, swiftly, abruptly |
| партийный | politics | drop | 0.870 | 1.13 | lemma-emptied | party, loyal, party line, member |
| подъезжать | drop in | drop | 0.860 | 1.01 | lemma-emptied | drive, get |
| переспрашивать | again | drop | 0.860 | 1.01 | lemma-emptied | ask, repeat, a |
| лесной | lumber | drop | 0.860 | 0.72 | lemma-emptied | forest, wood, timber |
| теракт | terror | drop | 0.860 | 0.97 | lemma-emptied | act, terrorism, terrorist |
| игровой | play | drop | 0.850 | 0.77 | lemma-emptied | game, acting, playing |
| засыпать | engulf | drop | 0.840 | 0.92 | lemma-emptied | fill, cover, bury, pour, into, strew, bombard |
| дружить | friends | drop | 0.830 | 0.48 | lemma-emptied |  |
| горный | mining | drop | 0.830 | 0.98 | lemma-emptied | mountain, rock |
| игровой | playing | drop | 0.830 | 0.77 | lemma-emptied | game, play, acting |
| читаться | like | drop | 0.830 | 0.94 | lemma-emptied | read, feel, reading |
| ничего | so-so | drop | 0.820 | 0.82 | lemma-emptied | not bad, fair, never mind, that's, all right, no problem |
| прилетать | descend | drop | 0.820 | 1.16 | lemma-emptied | aviation, land, touch down, soil, swiftly, abruptly |
| дорожный | travelling | drop | 0.820 | 0.89 | lemma-emptied | road |
| читаться | reading | drop | 0.820 | 0.94 | lemma-emptied | read, feel, like |
| засыпать | strew | drop | 0.810 | 0.92 | lemma-emptied | fill, cover, bury, engulf, pour, into, bombard |
| ничего | not bad | drop | 0.810 | 0.82 | lemma-emptied | so-so, fair, never mind, that's, all right, no problem |
| дискотека | dance | drop | 0.810 | 0.66 | lemma-emptied | record, library, event, evening, music |
| студенческий | student | drop | 0.810 | 0.43 | lemma-emptied |  |
| немка | woman | drop | 0.800 | 1.04 | lemma-emptied | german, girl |
| пасха | paskha | drop | 0.800 | 0.45 | lemma-emptied |  |
| желающий | desire | drop | 0.800 | 0.51 | lemma-emptied | wish |
| теракт | terrorism | drop | 0.800 | 0.97 | lemma-emptied | act, terror, terrorist |
| бутерброд | butterbrot | drop | 0.790 | 0.48 | lemma-emptied |  |
| интересоваться | ask | drop | 0.790 | 1.17 | lemma-emptied | interested, enquire |
| транспортный | shipping | drop | 0.790 | 1.21 | lemma-emptied | transportation, transport |
| октябрьский | october | drop | 0.790 | 0.48 | lemma-emptied |  |
| читаться | feel | drop | 0.790 | 0.94 | lemma-emptied | read, like, reading |
| полкило | half | drop | 0.780 | 0.95 | lemma-emptied | kilo |
| привыкать | get | drop | 0.780 | 1.04 | lemma-emptied | accustomed |
| первое | meal | drop | 0.780 | 0.79 | lemma-emptied | starter, course |
| дискотека | event | drop | 0.780 | 0.66 | lemma-emptied | record, library, evening, music, dance |
| квартплата | rent | drop | 0.780 | 0.39 | lemma-emptied |  |
| детский | baby | drop | 0.770 | 1.23 | lemma-emptied | child, children, childish |
| ничего | all right | drop | 0.770 | 0.82 | lemma-emptied | so-so, not bad, fair, never mind, that's, no problem |
| желающий | wish | drop | 0.770 | 0.51 | lemma-emptied | desire |
| полька | polish | drop | 0.760 | 0.98 | lemma-emptied | female, pole, woman, military, reduced, noise, mortar |
| партийный | loyal | drop | 0.760 | 1.13 | lemma-emptied | politics, party, party line, member |
| лесной | wood | drop | 0.760 | 0.72 | lemma-emptied | forest, lumber, timber |
| лесной | timber | drop | 0.760 | 0.72 | lemma-emptied | forest, wood, lumber |
| дежурить | duty | drop | 0.760 | 0.53 | lemma-emptied |  |
| разве | perhaps | drop | 0.750 | 0.92 | lemma-emptied | really, only, unless |
| разве | unless | drop | 0.750 | 0.92 | lemma-emptied | really, perhaps, only |
| чего | why | drop | 0.750 | 1.05 | lemma-emptied | what for, what |
| компьютерный | computer | drop | 0.750 | 0.55 | lemma-emptied |  |
| автомобильный | automobile | drop | 0.750 | 0.53 | lemma-emptied | car |
| приставка | video game | drop | 0.750 | 1.02 | lemma-emptied | linguistic, morphology, lexicography, grammar, console |
| партийный | party line | drop | 0.750 | 1.13 | lemma-emptied | politics, party, loyal, member |
| террористический | terrorist | drop | 0.750 | 0.64 | lemma-emptied |  |
| автомобильный | car | drop | 0.740 | 0.53 | lemma-emptied | automobile |
| пельмени | pelmeni | drop | 0.740 | 0.53 | lemma-emptied |  |
| повезти | convey | drop | 0.740 | 1.38 | lemma-emptied | carry, deliver, transport, lucky, luck, work out, succeed |
| повезти | lucky | drop | 0.740 | 1.38 | lemma-emptied | convey, carry, deliver, transport, luck, work out, succeed |
| тройка | trey | drop | 0.740 | 1.49 | lemma-emptied | three, card game, troika, trowsers, vest, jacket |
| здравствовать | thrive | drop | 0.730 | 0.89 | lemma-emptied | well, prosper |
| засыпать | pour | drop | 0.730 | 0.92 | lemma-emptied | fill, cover, bury, engulf, into, strew, bombard |
| прошлогодний | last year | drop | 0.730 | 0.78 | lemma-emptied |  |
| согласный | ready | drop | 0.720 | 1.54 | lemma-emptied | willing, agreeable, harmonious, concordant, phonetics, consonantic, consonantal |
| здравствовать | prosper | drop | 0.720 | 0.89 | lemma-emptied | well, thrive |
| детский | child | drop | 0.720 | 1.23 | lemma-emptied | children, childish, baby |
| детский | children | drop | 0.720 | 1.23 | lemma-emptied | child, childish, baby |
| чего | what for | drop | 0.720 | 1.05 | lemma-emptied | why, what |
| замолчать | silent | drop | 0.720 | 0.82 | lemma-emptied | conceal |
| нелегко | difficulty | drop | 0.720 | 0.83 | lemma-emptied | not, easily, easy |
| интересоваться | interested | drop | 0.720 | 1.17 | lemma-emptied | ask, enquire |
| товарный | trade | drop | 0.720 | 1.33 | lemma-emptied | commodity, goods, freight |
| новогодний | new year | drop | 0.710 | 0.61 | lemma-emptied |  |
| рок | fate | drop | 0.710 | 1.46 | lemma-emptied | doom, rock music |
| здравствовать | well | drop | 0.700 | 0.89 | lemma-emptied | prosper, thrive |
| миллиард | milliard | drop | 0.700 | 1.14 | lemma-emptied | billion |
| школьный | school | drop | 0.700 | 0.62 | lemma-emptied |  |
| рыбный | fish | drop | 0.700 | 0.65 | lemma-emptied | fish-filled, fishful |
| переспрашивать | repeat | drop | 0.700 | 1.01 | lemma-emptied | ask, again, a |
| повезти | luck | drop | 0.700 | 1.38 | lemma-emptied | convey, carry, deliver, transport, lucky, work out, succeed |
| промолчать | silent | drop | 0.700 | 0.75 | lemma-emptied |  |
| обучаться | training | drop | 0.700 | 0.94 | lemma-emptied | get, trained, receive |
| приставка | console | drop | 0.690 | 1.02 | lemma-emptied | linguistic, morphology, lexicography, grammar, video game |
| рок | doom | drop | 0.690 | 1.46 | lemma-emptied | fate, rock music |
| обучаться | trained | drop | 0.690 | 0.94 | lemma-emptied | get, receive, training |
| кот | tomcat | drop | 0.680 | 0.70 | lemma-emptied |  |
| ничего | never mind | drop | 0.680 | 0.82 | lemma-emptied | so-so, not bad, fair, that's, all right, no problem |
| ничего | no problem | drop | 0.680 | 0.82 | lemma-emptied | so-so, not bad, fair, never mind, that's, all right |
| телевизионный | tv | drop | 0.680 | 1.02 | lemma-emptied | television, tele- |
| полька | female | drop | 0.670 | 0.98 | lemma-emptied | pole, polish, woman, military, reduced, noise, mortar |
| рыбный | fish-filled | drop | 0.670 | 0.65 | lemma-emptied | fish, fishful |
| повезти | deliver | drop | 0.670 | 1.38 | lemma-emptied | convey, carry, transport, lucky, luck, work out, succeed |
| согласный | harmonious | drop | 0.660 | 1.54 | lemma-emptied | ready, willing, agreeable, concordant, phonetics, consonantic, consonantal |
| согласный | concordant | drop | 0.660 | 1.54 | lemma-emptied | ready, willing, agreeable, harmonious, phonetics, consonantic, consonantal |
| устанавливаться | formed | drop | 0.660 | 1.15 | lemma-emptied | settled, set in |
| шуметь | rustle | drop | 0.660 | 0.84 | lemma-emptied |  |
| обедать | eat | drop | 0.650 | 1.18 | lemma-emptied | lunch |
| полька | woman | drop | 0.650 | 0.98 | lemma-emptied | female, pole, polish, military, reduced, noise, mortar |
| первое | starter | drop | 0.650 | 0.79 | lemma-emptied | course, meal |
| читаться | read | drop | 0.650 | 0.94 | lemma-emptied | feel, like, reading |
| немка | german | drop | 0.640 | 1.04 | lemma-emptied | woman, girl |
| разве | really | drop | 0.640 | 0.92 | lemma-emptied | perhaps, only, unless |
| переспрашивать | ask | drop | 0.640 | 1.01 | lemma-emptied | again, repeat, a |
| повезти | succeed | drop | 0.640 | 1.38 | lemma-emptied | convey, carry, deliver, transport, lucky, luck, work out |
| горный | mountain | drop | 0.640 | 0.98 | lemma-emptied | rock, mining |
| лесной | forest | drop | 0.640 | 0.72 | lemma-emptied | wood, lumber, timber |
| молчать | silent | drop | 0.630 | 0.56 | lemma-emptied |  |
| повезти | carry | drop | 0.630 | 1.38 | lemma-emptied | convey, deliver, transport, lucky, luck, work out, succeed |
| дорожный | road | drop | 0.630 | 0.89 | lemma-emptied | travelling |
| товарный | commodity | drop | 0.630 | 1.33 | lemma-emptied | goods, freight, trade |
| товарный | freight | drop | 0.630 | 1.33 | lemma-emptied | commodity, goods, trade |
| откуда | where | drop | 0.620 | 1.14 | lemma-emptied | whence, from, which |
| повезти | transport | drop | 0.620 | 1.38 | lemma-emptied | convey, carry, deliver, lucky, luck, work out, succeed |
| интересоваться | enquire | drop | 0.620 | 1.17 | lemma-emptied | interested, ask |
| игровой | game | drop | 0.620 | 0.77 | lemma-emptied | play, acting, playing |
| кредитный | credit | drop | 0.620 | 0.88 | lemma-emptied |  |
| товарный | goods | drop | 0.620 | 1.33 | lemma-emptied | commodity, freight, trade |
| тройка | three | drop | 0.620 | 1.49 | lemma-emptied | card game, trey, troika, trowsers, vest, jacket |
| тройка | card game | drop | 0.620 | 1.49 | lemma-emptied | three, trey, troika, trowsers, vest, jacket |
| согласный | willing | drop | 0.610 | 1.54 | lemma-emptied | ready, agreeable, harmonious, concordant, phonetics, consonantic, consonantal |
| головной | head | drop | 0.610 | 1.22 | lemma-emptied | main, principal |
| головной | principal | drop | 0.610 | 1.22 | lemma-emptied | head, main |
| детский | childish | drop | 0.610 | 1.23 | lemma-emptied | child, children, baby |
| гордиться | proud | drop | 0.610 | 0.80 | lemma-emptied |  |
| сердиться | angry | drop | 0.610 | 0.88 | lemma-emptied |  |
| май | may | drop | 0.600 | 0.96 | lemma-emptied |  |
| засыпать | fill | drop | 0.600 | 0.92 | lemma-emptied | cover, bury, engulf, pour, into, strew, bombard |
| засыпать | cover | drop | 0.600 | 0.92 | lemma-emptied | fill, bury, engulf, pour, into, strew, bombard |
| из-под | from | drop | 0.600 | 1.36 | lemma-emptied | under |
| уставать | tired | drop | 0.600 | 0.80 | lemma-emptied |  |
| прилетать | land | drop | 0.600 | 1.16 | lemma-emptied | aviation, touch down, descend, soil, swiftly, abruptly |
| партийный | party | drop | 0.600 | 1.13 | lemma-emptied | politics, loyal, party line, member |
| разрезать | cut off | drop | 0.600 | 1.09 | lemma-emptied | bisect |
| чайный | tea | drop | 0.590 | 0.96 | lemma-emptied | scented, colored |
| газовый | gas | drop | 0.590 | 0.87 | lemma-emptied | gauze |
| первое | course | drop | 0.590 | 0.79 | lemma-emptied | starter, meal |
| заинтересоваться | interested | drop | 0.590 | 0.89 | lemma-emptied |  |
| откуда | from | drop | 0.580 | 1.14 | lemma-emptied | whence, where, which |
| согласный | consonantic | drop | 0.580 | 1.54 | lemma-emptied | ready, willing, agreeable, harmonious, concordant, phonetics, consonantal |
| замуж | married | drop | 0.580 | 0.92 | lemma-emptied |  |
| кухонный | kitchen | drop | 0.580 | 0.81 | lemma-emptied |  |
| повезти | work out | drop | 0.580 | 1.38 | lemma-emptied | convey, carry, deliver, transport, lucky, luck, succeed |
| налоговый | taxation | drop | 0.580 | 1.17 | lemma-emptied | tax |
| тройка | troika | drop | 0.580 | 1.49 | lemma-emptied | three, card game, trey, trowsers, vest, jacket |
| классик | classicist | drop | 0.580 | 1.24 | lemma-emptied | classic |
| оттуда | thence | drop | 0.570 | 1.23 | lemma-emptied | there |
| из-под | under | drop | 0.570 | 1.36 | lemma-emptied | from |
| прилетать | touch down | drop | 0.570 | 1.16 | lemma-emptied | aviation, land, descend, soil, swiftly, abruptly |
| уличный | street | drop | 0.570 | 0.71 | lemma-emptied |  |
| разрезать | bisect | drop | 0.570 | 1.09 | lemma-emptied | cut off |
| обедать | lunch | drop | 0.560 | 1.18 | lemma-emptied | eat |
| завтракать | breakfast | drop | 0.560 | 0.95 | lemma-emptied | lunch |
| лучше | rather | drop | 0.560 | 0.52 | lemma-emptied |  |
| сбоку | side | drop | 0.560 | 0.94 | lemma-emptied | askance |
| классик | classic | drop | 0.560 | 1.24 | lemma-emptied | classicist |
| согласный | consonantal | drop | 0.550 | 1.54 | lemma-emptied | ready, willing, agreeable, harmonious, concordant, phonetics, consonantic |
| транспортный | transportation | drop | 0.550 | 1.21 | lemma-emptied | transport, shipping |
| откуда | whence | drop | 0.540 | 1.14 | lemma-emptied | from, where, which |
| согласный | agreeable | drop | 0.540 | 1.54 | lemma-emptied | ready, willing, harmonious, concordant, phonetics, consonantic, consonantal |
| засыпать | bury | drop | 0.540 | 0.92 | lemma-emptied | fill, cover, engulf, pour, into, strew, bombard |
| чего | what | drop | 0.540 | 1.05 | lemma-emptied | what for, why |
| устанавливаться | settled | drop | 0.540 | 1.15 | lemma-emptied | formed, set in |
| телевизионный | television | drop | 0.520 | 1.02 | lemma-emptied | tv, tele- |
| налоговый | tax | drop | 0.520 | 1.17 | lemma-emptied | taxation |
| транспортный | transport | drop | 0.520 | 1.21 | lemma-emptied | transportation, shipping |
| мусульманский | muslim | drop | 0.520 | 0.97 | lemma-emptied |  |
| важно | importantly | drop | 0.510 | 0.97 | lemma-emptied | grandly |
| китаец | chinese | drop | 0.510 | 0.96 | lemma-emptied |  |
| миллиард | billion | drop | 0.510 | 1.14 | lemma-emptied | milliard |
| оттуда | there | drop | 0.510 | 1.23 | lemma-emptied | thence |
| утренний | morning | drop | 0.510 | 1.03 | lemma-emptied |  |
| вечерний | evening | drop | 0.510 | 0.93 | lemma-emptied |  |
| головной | main | drop | 0.500 | 1.22 | lemma-emptied | head, principal |
| японец | japanese | drop | 0.500 | 0.96 | lemma-emptied |  |
| привыкать | accustomed | drop | 0.500 | 1.04 | lemma-emptied | get |
| подъезжать | drive | drop | 0.500 | 1.01 | lemma-emptied | drop in, get |
| фотографировать | photograph | drop | 0.500 | 0.85 | lemma-emptied |  |
| рок | rock music | drop | 0.500 | 1.46 | lemma-emptied | fate, doom |
| устанавливаться | set in | drop | 0.500 | 1.15 | lemma-emptied | settled, formed |
| присниться | dream | drop | 0.500 | 0.89 | lemma-emptied |  |

## Lemmas the policy would empty (98)

| front | best guess | confidence | candidates |
| --- | --- | --- | --- |
| долго | time | 1.00 | time |
| откуда | from | 0.43 | whence, from, where, which |
| май | may | 1.00 | may |
| согласный | agreeable | 0.48 | ready, willing, agreeable, harmonious, concordant, phonetics, consonantic, consonantal |
| здравствовать | well | 0.44 | well, prosper, thrive |
| важно | importantly | 0.99 | importantly, grandly |
| головной | head | 0.50 | head, main, principal |
| китаец | chinese | 1.00 | chinese |
| засыпать | fill | 0.36 | fill, cover, bury, engulf, pour, into, strew, bombard |
| японец | japanese | 1.00 | japanese |
| себе | keep on | 1.00 | keep on |
| обедать | lunch | 0.91 | eat, lunch |
| чайный | tea | 1.00 | tea, scented, colored |
| бутерброд | butterbrot | 1.00 | butterbrot |
| завтракать | breakfast | 1.00 | breakfast, lunch |
| немка | german | 0.89 | german, woman, girl |
| ту | train | 0.17 | train, horn |
| та | ukrainian | 0.47 | internet, ukrainian |
| полька | polish | 0.62 | female, pole, polish, woman, military, reduced, noise, mortar |
| эта | eta | 1.00 | eta |
| полкило | half | 0.27 | half, kilo |
| бы | subjunctive | 0.05 | conditional, subjunctive |
| лучше | rather | 1.00 | rather |
| детский | childish | 0.28 | child, children, childish, baby |
| разве | really | 0.68 | really, perhaps, only, unless |
| чего | what | 0.83 | what for, why, what |
| молчать | silent | 1.00 | silent |
| миллиард | billion | 0.66 | billion, milliard |
| оттуда | there | 0.56 | thence, there |
| компьютерный | computer | 1.00 | computer |
| кот | tomcat | 1.00 | tomcat |
| из-под | under | 0.54 | from, under |
| школьный | school | 1.00 | school |
| замуж | married | 1.00 | married |
| неплохо | badly | 1.00 | badly |
| утренний | morning | 1.00 | morning |
| ничего | no problem | 0.37 | so-so, not bad, fair, never mind, that's, all right, no problem |
| автомобильный | automobile | 0.31 | car, automobile |
| замолчать | silent | 0.97 | silent, conceal |
| тем | the | 1.00 | the |
| телевизионный | television | 0.82 | tv, television, tele- |
| газовый | gas | 0.99 | gas, gauze |
| недолго | long | 0.57 | long, easily |
| дружить | friends | 1.00 | friends |
| новогодний | new year | 1.00 | new year |
| привыкать | accustomed | 0.94 | get, accustomed |
| уставать | tired | 1.00 | tired |
| первое | course | 0.40 | starter, course, meal |
| кухонный | kitchen | 1.00 | kitchen |
| дискотека | dance | 0.78 | record, library, event, evening, music, dance |
| пасха | paskha | 1.00 | paskha |
| рыбный | fish | 0.85 | fish, fish-filled, fishful |
| сбоку | side | 0.97 | askance, side |
| подъезжать | drive | 0.96 | drive, drop in, get |
| нелегко | difficulty | 0.55 | not, easily, difficulty, easy |
| фотографировать | photograph | 1.00 | photograph |
| прилетать | land | 0.65 | aviation, land, touch down, descend, soil, swiftly, abruptly |
| приставка | console | 0.51 | linguistic, morphology, lexicography, grammar, video game, console |
| переспрашивать | ask | 0.64 | ask, again, repeat, a |
| квартплата | rent | 1.00 | rent |
| пельмени | pelmeni | 1.00 | pelmeni |
| повезти | luck | 0.42 | convey, carry, deliver, transport, lucky, luck, work out, succeed |
| налоговый | tax | 0.86 | tax, taxation |
| горный | mountain | 0.95 | mountain, rock, mining |
| партийный | party | 0.92 | politics, party, loyal, party line, member |
| интересоваться | interested | 0.61 | interested, ask, enquire |
| вечерний | evening | 1.00 | evening |
| лесной | forest | 0.81 | forest, wood, lumber, timber |
| неизвестно | known | 1.00 | known |
| транспортный | transport | 0.39 | transportation, transport, shipping |
| рок | rock music | 0.56 | fate, doom, rock music |
| игровой | game | 0.91 | game, play, acting, playing |
| гордиться | proud | 1.00 | proud |
| дорожный | road | 0.80 | road, travelling |
| кредитный | credit | 1.00 | credit |
| студенческий | student | 1.00 | student |
| желающий | desire | 0.28 | wish, desire |
| товарный | commodity | 0.30 | commodity, goods, freight, trade |
| устанавливаться | settled | 0.67 | settled, formed, set in |
| уличный | street | 1.00 | street |
| сердиться | angry | 1.00 | angry |
| шуметь | rustle | 1.00 | rustle |
| тройка | three | 0.36 | three, card game, trey, troika, trowsers, vest, jacket |
| октябрьский | october | 1.00 | october |
| мусульманский | muslim | 1.00 | muslim |
| заинтересоваться | interested | 1.00 | interested |
| теракт | terrorism | 0.73 | act, terrorism, terror, terrorist |
| присниться | dream | 1.00 | dream |
| промолчать | silent | 1.00 | silent |
| читаться | read | 0.89 | read, feel, like, reading |
| террористический | terrorist | 1.00 | terrorist |
| пополам | two | 0.91 | two, all the same, matter |
| обучаться | trained | 0.80 | get, trained, receive, training |
| классик | classic | 0.60 | classic, classicist |
| цент | cent | 1.00 | cent |
| разрезать | cut off | 0.04 | cut off, bisect |
| дежурить | duty | 1.00 | duty |
| прошлогодний | last year | 1.00 | last year |
