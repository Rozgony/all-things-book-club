# All Things Book Club
A Portfolio by [Matt Schultz](https://matthewkschultz.com).

Live Website: [allthingsbook.club](https://allthingsbook.club).

## The Value Created

Before we dive into the how, we should focus on the what. To build a quality application, you must first have a strong understanding of the value you are bringing to your users. After participating in a traditional book club about a specific book, my friends and I wanted to continue the discussions but also wanted the freedom to read or watch whatever we want.

We realized we could still do that by taking a "read what you want" approach. Then we'd make it fun by using one of the free online spin wheels to determine the order in which we share. We'd all enter our topic, we'd spin the wheel, someone's topic would be selected, they would talk about it for a couple minutes, we'd all discuss for a couple minutes more, and then we'd spin again. It created fun and simple structure that gave us all a chance to listen and to talk about whatever interested us at the moment, be it a book, a video, a meme, or a conversation.

After having done this format for a couple years with both online groups and in-person, I decided to create a dedicated site with a custom wheel. This also provides us with a history of topics so the next time one of us was looking for something to read, we could go back to the meeting to get the name of that interesting documentary we talked about that one time. Because privacy is always important to me, I decided to make the site end-to-end encrypted, which presented an interesting question of:

> Who needs to know what and how can they be given access to know it?

## Using AI

It is hard to not discuss LLMs when considering how to build software these days. It has impacted everything from how hiring managers think about take home assignments for job applications, to how fast product teams can release a feature, to how engineers make sure we actually understand what we built.

For me, the most important aspect is to look past all the hype and start with first principles of how both the LLMs work and how human cognition works.

### How LLMs Work

Large Language Models use statistical inference of massive data sets to predict the most likely response to a prompt. More specifically, they predict the most likely next token based on what came before it. They are super useful at generating a large amount of text in a short period of time but their strength and their weakness are that they are non-deterministic: their output isn't determined by a set of rules. Instead, it is determined by a token's likelihood, learned during training, and then the most probable next token in the sequence when the model is run. This means they can interact with non-structured data in a way we never could before but it also means they have a tendency to "hallucinate", which is a fancy word for providing inaccurate information.

### How Human Cognition Works

Despite tech companies having a long history of cherry picking and misunderstanding social science research, there is actually a good deal of quality research out there. One of the most relevant concepts to understand is [Automation Bias](https://web.archive.org/web/20141101113133/http://web.mit.edu/aeroastro/labs/halab/papers/CummingsAIAAbias.pdf):

> Automation bias occurs in decision-making because humans have a tendency to disregard or not search for contradictory information in light of a computer-generated solution that is accepted as correct and can be exacerbated in time critical domains.

This is something we've known about human cognition since long before the rise of LLMs and continues to be a focus of research. [A recent study](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6097646) from The Wharton School built off [System 1 (intuitive) and System 2 (deliberative)](https://us.macmillan.com/books/9780374533557/thinkingfastandslow/) understanding of cognition to propose a System 3: Cognitive Surrender:

> adopting AI outputs with minimal scrutiny, overriding intuition (System 1) and deliberation (System 2).

### How I used Claude

All this isn't to say that we should take a reactionary stance against AI but rather if we understand the tool, our own cognition, and the potential pitfalls, we can find an efficient and rigorous use of it.

One of the most useful concepts is that of the [centaur](https://hdsr.mitpress.mit.edu/pub/3rvlzjtw/release/4). The centaur is the mythical creature with a human upper body and head and horse lower body and legs. My goal is to be an AI centaur: using my human head and hands to steer the super efficient LLM legs so we can move fast together. This minimizes the likelihood of automation bias while still benefiting from the speed and training of LLMs.

In practice that means several things. First, it is about me deciding what I want to build, how I want to architect it, and then getting feedback from Claude. That's actually how I wrote the paragraph above about how LLMs work: I wrote it myself so I could use the writing process to develop the ideas and then got feedback from Claude once it was written to ensure its accuracy. This approach means I've already developed an opinion and am thus less susceptible to undue influence. It also confirms the ideas are indeed mine.

Second, as I implemented my plan, I told Claude what to do and then manually approved its changes. This way I had an opinion about what I wanted and could proactively accept or modify the output. This is still much faster than me writing myself and I still stay engaged throughout the process so I can identify issues and correct them as needed.

### Learning with Claude

One of the common statements I hear about AI is:

> It's great at the things I don't know well but it's not so good at the things I do know well.

For example, a friend of mine who loves to sail showed me an AI-generated picture of people on a sailboat. I've been on his sailboat before and the picture looked great to me but he said, no, this is all wrong, this line doesn't go there, it's missing this line and that sail is in the wrong place. I am not a sailor and so I didn't know what I didn't know.

Likewise, I had never architected an end-to-end encryption site before and so my goal was to learn encryption architecture well enough so that I could know what was wrong with Claude's recommendations. So first I told Claude what I wanted to build and we talked through the architecture. Then, I told Claude to establish patterns for me that I could copy. We as humans learn better by doing and so I pretended I was a junior developer jumping into an existing code base. I used the patterns Claude established, then wrote my own code in several other places based on those patterns. Finally, I asked Claude to check my work and explain any mistakes I made.

Once I had everything written and working, I asked Claude to make me a study guide with questions (and not answers) about the concepts and algorithms we had used. Then I did my own research on sites such as [OWASP](https://owasp.org/) to make sure I understood the architectural patterns. Finally, I went back to the code to look for the errors that an expert would surely find, just as my friend found errors in the sailboat image.

### What Claude Got Wrong

The E2EE section below describes the full architecture, but in short, I derive user encryption keys from their password, then use that key to encrypt user data and wrap the encryption key for each book club chapter that is shared between its users. The most private data is what is shared in the chapters and not the basic information on the user profile. So Claude had me use the weaker PBKDF2 to derive the user key. Claude's logic was that even though PBKDF2 is not as secure because it's not memory-hard, using it with HMAC-SHA-256 and 600,000 iterations was still okay because it was only the profile data and not chapter data being encrypted. This missed the crucial point that the user key also wrapped the chapter key so if the user key was cracked, all the chapter data would be completely available.

There were also several issues around the invite architecture. Asymmetric encryption using X25519 and HKDF-SHA256 is generally a good way to handle sharing information between two strangers, so that's what Claude suggested. However, it requires both parties to already have a public key that can be used for the encryption hand off. That worked when we implemented the first part where the invite to a book club chapter was sent from one existing user to another. Since this was how most users were invited to a chapter, Claude then had me change how the member's chapter key was wrapped, from the password-derived key to the X25519 key.

However, when we got to the part where we supported inviting someone without an account yet, we couldn't do asymmetric encryption. I wanted a more user-friendly invite flow where the new user created their account during invite acceptance, rather than before an invite could be sent. For this approach, we had to generate a one-time symmetric token that was valid until first use and then deleted. To streamline the process, and because email interception was a common risk in both approaches, I then made both invite paths use the one-time symmetric token. While reviewing the process, I realized that made the whole X25519 and HKDF-SHA256 architecture useless and so I pulled all of it out.

## End-to-End Encryption

### Starting Questions and Threat Model

When developing an End-to-End Encryption (E2EE) architecture, it is important to ask the following questions. The answers to these questions will guide the rest of the architecture and implementation.

> 1. What threats are we protecting against by encrypting?
> 2. Who should be allowed to have access to what data?
> 3. How do we give them access?
> 4. For how long do we give them access?
> 5. What is the minimum amount of unencrypted metadata the site needs to function?

I wanted a server-blind architecture that would prevent myself or successful hackers from accessing user data. Since it is a book club app, I needed to be able to encrypt both individual user data and shared chapter (or group) data. Users should have access to all the chapter data for the duration of the time they are part of the chapter. They should also be able to invite other people to their book club chapter. This site is also unlikely to be used in high-risk scenarios such as by government whistleblowers, and so while rigorous encryption is important, trade-offs between privacy and usability can be considered.

### Key Hierarchy

In practice that meant encrypting user data with their own key and encrypting chapter data with a shared key. The `userKey` is derived from their password plus a server-generated salt using the memory-hard Argon2id algorithm, then imported as an AES-256-GCM key. A salt is stored unencrypted on the user record and any other profile data is stored in the encryptedBlob field. Encryption and decryption always happens client side so the server never sees the sensitive information.

Each user has a `chapter_member` join record for each book club chapter they are in. This holds their version of the `chapterKey` that is wrapped by their `userKey`. Their nickname in that chapter is also held in the encryptedBlob on their `chapter_member`. It is encrypted with the shared `chapterKey` so other members can see it. It is important to note that because the `userKey` is password-derived, the user changing their password requires not only the re-encryption of their user data but also the re-wrapping of each of their `chapterKey` values.

### Symmetric Encryption — AES-256-GCM

All of the encryption in the app uses AES-256-GCM symmetric encryption. This means it uses the 256 bit Advanced Encryption Standard with Galois/Counter Mode. It is called symmetric because it uses the same key for both the encryption and decryption of the data. The Galois/Counter Mode uses an authentication tag to ensure the encryption hasn't been tampered with. Every time data is re-encrypted, a new randomly generated nonce (number used only once) is created to make it more difficult to reconstruct the encryption process.

The Argon2id key derivation is used because it is memory-hard, making GPU-parallel cracking attacks — the kind that make a compute-bound KDF like PBKDF2 comparatively weak — much more difficult. Since it is browser-based login and derivation, I had to use the minimum standard of 19 MiB of memory, 2 iterations, and 1 degree of parallelism for the Argon2id parameters. For the initial iterations of this design, see the "What Claude Got Wrong" section above.

### Invite Key Transport — One-Time Secret

Since I wanted to prioritize ease of entry to a book club chapter to facilitate growth, I chose to go with a one-time secret for invites rather than asymmetric encryption, which would require the invitee to already have an account before an invite could be created for them.

When an invite is created, a `chapter_invitation` record is created with the lookup token and the wrapped `chapterKey` ciphertext and nonce. A one-time secret of 32 random bytes is generated and used as an AES-256-GCM key to wrap the `chapterKey`. That raw secret is added to the hash of the invite URL so the server never sees it. When the receiver follows the invite URL, the invite token is used to look up the invite record and the one-time encryption key in the URL hash is used to decrypt the `chapterKey`. Then the new `chapter_member` record is created with that `chapterKey` now being wrapped by the user's `userKey`.

While this does provide for the most streamlined invitation process for new users, it is not without risk. Anyone who intercepts that URL could then gain access to the `chapterKey`. To mitigate these risks, the user is provided with the option of copying and sending the URL directly themselves, e.g. via Signal, or by the less secure email method. Once an invitation is accepted by a user, that invite is automatically deleted. Invitations that have not been accepted within 7 days are also automatically deleted by an hourly goroutine.

### What We Store Server-Side (Metadata)

What this means for server visibility is that the only things stored in plaintext are the fields absolutely necessary for the app to function. For example, `chapter_members` has a `role` field that the server checks when enforcing access control for destructive actions. Conversely, all timestamps (e.g. createdAt, updatedAt, joinedAt) are held in the encryptedBlobs. The exception is the `scheduled_at` field on meetings, which is necessary to determine when the meeting is happening. The most information that can be gleaned from the metadata is a current membership graph of who is in what chapter with whom, although once a member leaves a chapter, that history of a relationship is gone.

## Reflections

So regarding using AI as a coding tool, if Claude isn't occasionally acknowledging that it is over-complicating things, that it can't actually find a citation for a fact it is asserting, or that it has created a bug, then you aren't using it correctly. That said, that doesn't mean it is not an extremely useful tool to quickly write robust applications and learn new technologies. Stopping to take courses, research various encryption architectures, and figure out what is applicable to my site would have taken a much longer time without Claude. But the answer to that isn't just do whatever Claude says, it's to use Claude as a starting point and a case study to develop your own knowledge and skills. As always, how you use the tool is the most important aspect.

Regarding what I learned from my End-to-End Encryption experience, it trained me to think about who needs to know what information, how I can give them access to that information, and how long they should have access to the information. It also greatly simplifies addressing concerns of privacy and security: if neither I nor a hacker can do anything with the encrypted information, there is much less of a concern.

## Works Cited

- **Cummings, Mary L. "Automation Bias in Intelligent Time Critical Decision Support Systems."** *AIAA 2004*. MIT Aeronautics and Astronautics Laboratory. <https://web.archive.org/web/20141101113133/http://web.mit.edu/aeroastro/labs/halab/papers/CummingsAIAAbias.pdf>
- **Kaur, Priyanka, and Matthew S. Isaac. "System 3: The Impact of Cognitive Surrender on AI-Assisted Decision-Making."** *SSRN*. The Wharton School. <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6097646>
- **Kahneman, Daniel. *Thinking, Fast and Slow.*** Farrar, Straus and Giroux, 2011. <https://us.macmillan.com/books/9780374533557/thinkingfastandslow/>
- **Nordstrom, Louis. "The Centaur: Productive Human-AI Collaboration."** *Harvard Data Science Review*, Vol. 3, No. 4. <https://hdsr.mitpress.mit.edu/pub/3rvlzjtw/release/4>
- **OWASP.** Open Worldwide Application Security Project. <https://owasp.org/>
