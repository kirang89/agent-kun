# Art of README

> Source: [hackergrrl/art-of-readme](https://github.com/hackergrrl/art-of-readme)

## Etymology

Where does the term "README" come from?

The nomenclature dates back to *at least* the 1970s and the PDP-10, though it may even harken back to the days of informative paper notes placed atop stacks of punchcards, "READ ME!" scrawled on them, describing their use.

The pattern of README appearing in all-caps is a consistent facet throughout history. In addition to the visual strikingness of using all-caps, UNIX systems would sort capitals before lower case letters, conveniently putting the README before the rest of the directory's content.

The intent is clear: *"This is important information for the user to read before proceeding."*

## For creators, for consumers

This is an article about READMEs. About what they do, why they are an absolute necessity, and how to craft them well.

This is written for module creators, for as a builder of modules, your job is to create something that will last. This is an inherent motivation, even if the author has no intent of sharing their work. Once 6 months pass, a module without documentation begins to look new and unfamiliar.

## The README: Your one-stop shop

A README is a module consumer's first -- and maybe only -- look into your creation. The consumer wants a module to fulfill their need, so you must explain exactly what need your module fills, and how effectively it does so.

Your job is to:

1. tell them what it is (with context)
2. show them what it looks like in action
3. show them how they use it
4. tell them any other relevant details

## Brevity

The lack of a README is a powerful red flag, but even a lengthy README is not indicative of there being high quality. The ideal README is as short as it can be without being any shorter. Detailed documentation is good -- make separate pages for it! -- but keep your README succinct.

## No README? No abstraction

No README means developers will need to delve into your code in order to understand it.

> Your documentation is complete when someone can use your module without ever having to look at its code. This is very important. This makes it possible for you to separate your module's documented interface from its internal implementation (guts). This is good because it means that you are free to change the module's internals as long as the interface remains the same.
>
> Remember: the documentation, not the code, defines what a module does.
> -- Ken Williams

## Key elements

Once a README is located, the brave module spelunker must scan it to discern if it matches the developer's needs. This becomes essentially a series of pattern matching problems for their brain to solve, where each step takes them deeper into the module and its details.

1. *Name* -- self-explanatory names are best. If the name sounds too vague or unrelated, it may be a signal to move on.

2. *One-liner* -- having a one-liner that describes the module is useful for getting an idea of what the module does in slightly greater detail.

3. *Usage* -- rather than starting to delve into the API docs, it'd be great to see what the module looks like in action. I can quickly determine whether the example fits the desired style and problem.

4. *API* -- the name, description, and usage all sound appealing. I'm very likely to use this module at this point. I just need to scan the API to make sure it does exactly what I need.

5. *Installation* -- if I've read this far down, then I'm sold on trying out the module. If there are nonstandard installation notes, here's where they'd go.

6. *License* -- most modules put this at the very bottom, but this might actually be better to have higher up; you're likely to exclude a module VERY quickly if it has a license incompatible with your work.

## Cognitive funneling

The ordering of the above was not chosen at random.

Module consumers use many modules, and need to look at many modules. Once you've looked at hundreds of modules, you begin to notice that the mind benefits from predictable patterns.

Thus, it follows that in a README it is desirable to have:

1. a predictable format
2. certain key elements present

The ordering presented here is lovingly referred to as "cognitive funneling," and can be imagined as a funnel held upright, where the widest end contains the broadest more pertinent details, and moving deeper down into the funnel presents more specific details that are pertinent for only a reader who is interested enough in your work to have reached that deeply in the document.

> The level of detail in Perl module documentation generally goes from less detailed to more detailed. Your SYNOPSIS section should contain a minimal example of use (perhaps as little as one line of code; skip the unusual use cases or anything not needed by most users); the DESCRIPTION should describe your module in broad terms, generally in just a few paragraphs; more detail of the module's routines or methods, lengthy code examples, or other in-depth material should be given in subsequent sections.
>
> Ideally, someone who's slightly familiar with your module should be able to refresh their memory without hitting "page down". As your reader continues through the document, they should receive a progressively greater amount of knowledge.
> -- from `perlmodstyle`

## Care about people's time

Your job, when you're doing it with optimal altruism in mind, isn't to "sell" people on your work. It's to let them evaluate what your creation does as objectively as possible, and decide whether it meets their needs or not.

## Bonus: The README Checklist

A helpful checklist to gauge how your README is coming along:

- [ ] One-liner explaining the purpose of the module
- [ ] Necessary background context & links
- [ ] Potentially unfamiliar terms link to informative sources
- [ ] Clear, *runnable* example of usage
- [ ] Installation instructions
- [ ] Extensive API documentation
- [ ] Performs cognitive funneling
- [ ] Caveats and limitations mentioned up-front
- [ ] Doesn't rely on images to relay critical information
- [ ] License
